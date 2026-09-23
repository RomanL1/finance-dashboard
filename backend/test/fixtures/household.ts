import type { Household } from '../../src/features/household/model/household.js';
import type { SupportedCurrency } from '../../src/shared/kernel/index.js';

export function makeHousehold(
    baseCurrency: SupportedCurrency = 'CHF',
    id = 'household-1',
): Household {
    return {
        id,
        name: 'Home',
        onboardingComplete: true,
        baseCurrency,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
}
