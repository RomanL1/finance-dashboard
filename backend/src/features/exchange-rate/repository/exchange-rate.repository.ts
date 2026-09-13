import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, gte, lte, max, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { SupportedCurrency } from '../../../shared/kernel/index.js';
import { exchangeRate } from '../model/exchange-rate.schema.js';
import type { ExchangeRate } from '../model/exchange-rate.js';

@Injectable()
export class ExchangeRateRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    /** Newest day stored for `base`, or null when nothing was synced yet. */
    async latestDay(base: SupportedCurrency): Promise<string | null> {
        const [row] = await this.db
            .select({ day: max(exchangeRate.date) })
            .from(exchangeRate)
            .where(eq(exchangeRate.base, base));
        return row?.day ?? null;
    }

    /** Oldest day stored for `base`, or null when nothing was synced yet. */
    async earliestDay(base: SupportedCurrency): Promise<string | null> {
        const [row] = await this.db
            .select({ day: sql<string | null>`min(${exchangeRate.date})` })
            .from(exchangeRate)
            .where(eq(exchangeRate.base, base));
        return row?.day ?? null;
    }

    /** All rates for `base` with `fromDay <= date <= toDay`, oldest first. */
    async listRates(
        base: SupportedCurrency,
        fromDay: string,
        toDay: string,
    ): Promise<ExchangeRate[]> {
        const rows = await this.db
            .select()
            .from(exchangeRate)
            .where(
                and(
                    eq(exchangeRate.base, base),
                    gte(exchangeRate.date, fromDay),
                    lte(exchangeRate.date, toDay),
                ),
            )
            .orderBy(exchangeRate.date);
        return rows as ExchangeRate[];
    }

    /** Newest rate per quote on or before `day` for `base`; the fallback for days without a row. */
    async latestOnOrBefore(
        base: SupportedCurrency,
        day: string,
    ): Promise<ExchangeRate[]> {
        const newer = alias(exchangeRate, 'newer');
        const rows = await this.db
            .select()
            .from(exchangeRate)
            .where(
                and(
                    eq(exchangeRate.base, base),
                    lte(exchangeRate.date, day),
                    notExists(
                        this.db
                            .select({ one: sql`1` })
                            .from(newer)
                            .where(
                                and(
                                    eq(newer.base, exchangeRate.base),
                                    eq(newer.quote, exchangeRate.quote),
                                    lte(newer.date, day),
                                    gt(newer.date, exchangeRate.date),
                                ),
                            ),
                    ),
                ),
            );
        return rows as ExchangeRate[];
    }

    /**
     * Days before `replaceFromDay` are final once mirrored (reference rates do not change after
     * publication) and are never overwritten. Rows from `replaceFromDay` on may be replaced: the
     * newest mirrored day could have been fetched before that day's publication (carried-forward value).
     */
    async storeMany(
        rates: ExchangeRate[],
        replaceFromDay: string,
    ): Promise<void> {
        const final = rates.filter((r) => r.date < replaceFromDay);
        const replaceable = rates.filter((r) => r.date >= replaceFromDay);
        if (final.length > 0) {
            await this.db
                .insert(exchangeRate)
                .values(final)
                .onConflictDoNothing();
        }
        if (replaceable.length > 0) {
            await this.db
                .insert(exchangeRate)
                .values(replaceable)
                .onConflictDoUpdate({
                    target: [
                        exchangeRate.base,
                        exchangeRate.quote,
                        exchangeRate.date,
                    ],
                    set: { rate: sql`excluded.rate` },
                });
        }
    }
}
