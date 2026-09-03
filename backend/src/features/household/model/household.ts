import type { Id } from '../../../shared/kernel/index.js';
import type { HOUSEHOLD_ROLES } from './household.schema.js';

export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

/** Domain model. Independent of persistence and transport shapes. */
export interface Household {
    id: Id;
    name: string;
    currency: string;
    onboardingComplete: boolean;
    createdAt: Date;
}

export interface HouseholdMembership {
    household: Household;
    role: HouseholdRole;
}
