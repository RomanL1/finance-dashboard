import type { Id, SupportedCurrency } from '../../../shared/kernel/index.js';
import type { HOUSEHOLD_ROLES } from './household.schema.js';

export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

/** Domain model. Independent of persistence and transport shapes. */
export interface Household {
    id: Id;
    name: string;
    onboardingComplete: boolean;
    /** Currency that multi-currency figures are converted into. */
    baseCurrency: SupportedCurrency;
    createdAt: Date;
}

export interface UpdateHouseholdInput {
    name?: string;
    baseCurrency?: SupportedCurrency;
}

export interface HouseholdMembership {
    household: Household;
    role: HouseholdRole;
}
