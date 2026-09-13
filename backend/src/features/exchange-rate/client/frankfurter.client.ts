import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../../shared/infra/config/env.js';
import {
    SUPPORTED_CURRENCIES,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';
import type { ExchangeRate } from '../model/exchange-rate.js';

/** Provider abstraction so the service can be unit-tested and the provider swapped. */
export interface RateProvider {
    /** Daily rates for `base` against `quotes`, `fromDay..toDay` inclusive. Empty when the provider has none. */
    fetchRates(
        base: SupportedCurrency,
        quotes: SupportedCurrency[],
        fromDay: string,
        toDay: string,
    ): Promise<ExchangeRate[]>;
}

interface FrankfurterRow {
    date: string;
    base: string;
    quote: string;
    rate: number;
}

/** `GET {url}/rates?base=CHF&quotes=EUR,USD&from=YYYY-MM-DD&to=YYYY-MM-DD` → `[{date, base, quote, rate}]`. */
@Injectable()
export class FrankfurterClient implements RateProvider {
    private readonly logger = new Logger(FrankfurterClient.name);
    private readonly baseUrl = env.exchangeRateApiUrl.replace(/\/+$/, '');

    async fetchRates(
        base: SupportedCurrency,
        quotes: SupportedCurrency[],
        fromDay: string,
        toDay: string,
    ): Promise<ExchangeRate[]> {
        const url = new URL(`${this.baseUrl}/rates`);
        url.searchParams.set('base', base);
        url.searchParams.set('quotes', quotes.join(','));
        url.searchParams.set('from', fromDay);
        url.searchParams.set('to', toDay);

        const response = await fetch(url, {
            headers: { accept: 'application/json' },
            // Multi-month ranges have been observed to take >15s on the public instance.
            signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
            throw new Error(
                `Rate provider responded ${response.status} for ${url.pathname}`,
            );
        }
        const body: unknown = await response.json();
        if (!Array.isArray(body)) {
            throw new Error('Rate provider returned a non-array body');
        }
        const rates: ExchangeRate[] = [];
        for (const row of body as FrankfurterRow[]) {
            if (
                isSupportedCurrency(row.base) &&
                isSupportedCurrency(row.quote) &&
                typeof row.date === 'string' &&
                typeof row.rate === 'number' &&
                row.rate > 0
            ) {
                rates.push({
                    base: row.base,
                    quote: row.quote,
                    date: row.date,
                    rate: row.rate,
                });
            } else {
                this.logger.warn(
                    `Skipping malformed rate row ${JSON.stringify(row)}`,
                );
            }
        }
        return rates;
    }
}

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
    return (SUPPORTED_CURRENCIES as readonly unknown[]).includes(value);
}
