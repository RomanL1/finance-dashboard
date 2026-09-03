import type { OnboardingHouseholdDto } from '../api';

export const CURRENCIES: readonly OnboardingHouseholdDto['currency'][] = [
    'CHF',
    'EUR',
    'USD',
    'GBP',
] as const;

export type Currency = OnboardingHouseholdDto['currency'];
