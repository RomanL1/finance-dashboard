import type { CreateAccountDto } from '../api';

export type Currency = CreateAccountDto['currency'];

export const CURRENCIES: readonly Currency[] = ['CHF', 'EUR', 'USD', 'GBP'];
