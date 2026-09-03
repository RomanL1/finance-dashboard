import type { CreateHouseholdDto, DefaultCategoryDto } from '../../core/api';

export type { DefaultCategoryDto };

export const CURRENCIES: readonly CreateHouseholdDto['currency'][] = [
    'CHF',
    'EUR',
    'USD',
    'GBP',
] as const;

export type Currency = CreateHouseholdDto['currency'];

export interface CategorySelection {
    translateKeys: string[];
    customNames: string[];
}
