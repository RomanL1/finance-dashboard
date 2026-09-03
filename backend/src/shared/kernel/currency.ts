export const SUPPORTED_CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
