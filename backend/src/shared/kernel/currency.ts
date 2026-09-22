export const SUPPORTED_CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Upper bound for a single amount in minor units (1 billion major units).
 * Leaves headroom so balance sums stay below Number.MAX_SAFE_INTEGER.
 */
export const MAX_AMOUNT = 100_000_000_000;
