import type { SupportedCurrency } from '../../../shared/kernel/index.js';

/** One provider observation: 1 `base` = `rate` × `quote` on `date`. */
export interface ExchangeRate {
    base: SupportedCurrency;
    quote: SupportedCurrency;
    /** `YYYY-MM-DD` */
    date: string;
    rate: number;
}

/** Converts minor-unit amounts of any supported currency into one base currency. */
export interface CurrencyConverter {
    readonly base: SupportedCurrency;
    /** Rounded to minor units of `base`. Uses the latest rate on or before `date`. */
    toBase(amount: number, currency: SupportedCurrency, date: Date): number;
}

/** `YYYY-MM-DD` in UTC, the provider's calendar. */
export function toDay(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
    const d = new Date(`${day}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return toDay(d);
}
