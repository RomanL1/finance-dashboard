import type { Id, SupportedCurrency } from '../../../shared/kernel/index.js';
import type { HOUSEHOLD_ROLES } from './household.schema.js';

export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

export interface Household {
    id: Id;
    name: string;
    onboardingComplete: boolean;
    /** Every account and transaction uses this currency. Changing it relabels, never converts. */
    baseCurrency: SupportedCurrency;
    /** IANA zone. Recurring transactions book at local midnight here; a change only affects later occurrences. */
    timeZone: string;
    createdAt: Date;
}

export interface UpdateHouseholdInput {
    name?: string;
    baseCurrency?: SupportedCurrency;
    timeZone?: string;
}

export interface HouseholdMembership {
    household: Household;
    role: HouseholdRole;
}

export interface HouseholdMember {
    userId: Id;
    name: string;
    email: string;
    role: HouseholdRole;
    joinedAt: Date;
}
