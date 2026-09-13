import {
    Inject,
    Injectable,
    Logger,
    type OnApplicationBootstrap,
} from '@nestjs/common';
import {
    SUPPORTED_CURRENCIES,
    UnavailableError,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';
import {
    FrankfurterClient,
    type RateProvider,
} from '../client/frankfurter.client.js';
import {
    addDays,
    toDay,
    type CurrencyConverter,
    type ExchangeRate,
} from '../model/exchange-rate.js';
import { ExchangeRateRepository } from '../repository/exchange-rate.repository.js';
import { HouseholdRepository } from '../../household/repository/household.repository.js';

/**
 * Keeps a local mirror of daily rates and hands out converters over it.
 *
 * Provider traffic is bounded to one request per base currency per calendar day, plus one
 * backfill request whenever a range reaches further back than the mirror does. Provider
 * failures are logged and the mirror is used as-is; only a conversion with no usable rate fails.
 *
 * Mirrored days are immutable once past (see the repository), so a transaction converts to the
 * same number on every read. A future-dated entry uses the newest known rate until its day arrives.
 */
@Injectable()
export class ExchangeRateService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ExchangeRateService.name);
    /** Base currency → the UTC day it was last synced on. */
    private readonly syncedOn = new Map<SupportedCurrency, string>();

    constructor(
        private readonly rates: ExchangeRateRepository,
        @Inject(FrankfurterClient) private readonly provider: RateProvider,
        private readonly households: HouseholdRepository,
    ) {}

    /** Warm-up: top up every base in use so the first analytics request of the day does not wait on the provider. */
    onApplicationBootstrap(): void {
        void this.households
            .listBaseCurrencies()
            .then((bases) =>
                Promise.all(
                    bases.map((base) => this.sync(base, toDay(this.now()))),
                ),
            )
            .catch((error: Error) =>
                this.logger.warn(`Rate warm-up skipped: ${error.message}`),
            );
    }

    /** Overridable clock for tests. */
    protected now(): Date {
        return new Date();
    }

    /** A converter into `base` that covers `[from, to]`. Syncs the mirror first when needed. */
    async converter(
        base: SupportedCurrency,
        from: Date,
        to: Date,
    ): Promise<CurrencyConverter> {
        const fromDay = toDay(from);
        const toDayInclusive = toDay(to);
        await this.sync(base, fromDay);

        const inRange = await this.rates.listRates(
            base,
            fromDay,
            toDayInclusive,
        );
        const before = await this.rates.latestOnOrBefore(
            base,
            addDays(fromDay, -1),
        );
        // No eager check: a household whose accounts all use `base` never needs a rate.
        const table = buildLookup([...before, ...inRange]);

        return {
            base,
            toBase(amount, currency, date) {
                if (currency === base) return amount;
                const rate = lookup(table, currency, toDay(date));
                if (rate === undefined) {
                    throw new UnavailableError(
                        `No ${base}/${currency} exchange rate on or before ${toDay(date)}`,
                    );
                }
                return Math.round(amount / rate);
            },
        };
    }

    /**
     * One provider request per base per day for new days, plus a backfill when `neededFromDay`
     * lies before the mirror's oldest day. Never throws: the caller works with what is mirrored.
     */
    async sync(base: SupportedCurrency, neededFromDay: string): Promise<void> {
        const today = toDay(this.now());
        const quotes = SUPPORTED_CURRENCIES.filter((c) => c !== base);
        const [earliest, latest] = await Promise.all([
            this.rates.earliestDay(base),
            this.rates.latestDay(base),
        ]);

        const needsBackfill = earliest === null || neededFromDay < earliest;
        const needsToday =
            this.syncedOn.get(base) !== today &&
            (latest === null || latest < today);
        if (!needsBackfill && !needsToday) return;

        // One request covers both cases: from the oldest needed day up to today. The newest
        // mirrored day is included again: if it was fetched before publication it is provisional.
        const fromDay = needsBackfill ? neededFromDay : (latest as string);
        try {
            const fetched = await this.provider.fetchRates(
                base,
                quotes,
                fromDay,
                today,
            );
            // Everything before the previously newest day is final; that day itself may have been provisional.
            await this.rates.storeMany(fetched, latest ?? fromDay);
            this.syncedOn.set(base, today);
            this.logger.log(
                `Synced ${fetched.length} ${base} rates (${fromDay}..${today})`,
            );
        } catch (error) {
            this.logger.warn(
                `Rate sync for ${base} failed, using mirrored rates: ${(error as Error).message}`,
            );
        }
    }
}

/** quote → sorted days → rate. */
type Lookup = Map<
    SupportedCurrency,
    { readonly day: string; readonly rate: number }[]
>;

function buildLookup(rows: ExchangeRate[]): Lookup {
    const table: Lookup = new Map();

    for (const row of rows.toSorted((a, b) => a.date.localeCompare(b.date))) {
        const series = table.get(row.quote) ?? [];
        series.push({ day: row.date, rate: row.rate });
        table.set(row.quote, series);
    }

    return table;
}

/** Rate on the latest day `<= day`; undefined when the series starts later. */
function lookup(
    table: Lookup,
    quote: SupportedCurrency,
    day: string,
): number | undefined {
    const series = table.get(quote);
    if (!series) return;

    let lo = 0;
    let hi = series.length;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (series[mid]!.day <= day) lo = mid + 1;
        else hi = mid;
    }

    return series[lo - 1]?.rate;
}
