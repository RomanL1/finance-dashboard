import {
    newId,
    ValidationError,
    type Id,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';

export interface CreateAccount {
    id: Id;
    description: string;
    currency: string;
    initialValue: number;
    startDate: Date;
    archivedAt: Date | null;
}

/** Domain model. Independent of persistence and transport shapes. */
export interface Account {
    id: Id;
    householdId: Id;
    /** Per-household running number starting at 1. Assigned by the repository. */
    number: number;
    description: string;
    currency: string;
    initialValue: number;
    /** Current balance: initialValue plus the signed sum of its transactions. Computed, never stored. */
    amount: number;
    startDate: Date;
    archivedAt: Date | null;
    createdAt: Date;
}

/** Sum of the active account balances, converted into the household base currency. Minor units. */
export interface HouseholdBalance {
    currency: SupportedCurrency;
    amount: number;
}

/** Active = not archived, or archived at a date still in the future. */
export function isActiveAccount(account: Account, at: Date): boolean {
    return account.archivedAt === null || account.archivedAt > at;
}

export interface CreateAccountInput {
    description: string;
    currency: string;
    initialValue: number;
    startDate: Date;
    archivedAt?: Date | null;
}

/** Everything but the initial value, which is fixed at creation. */
export type UpdateAccountInput = Omit<CreateAccountInput, 'initialValue'>;
export type UpdateAccount = Omit<CreateAccount, 'initialValue'>;

/** Domain rules for a new account, independent of how it is persisted. */
export function buildAccount(input: CreateAccountInput): CreateAccount {
    return { ...buildAccountUpdate(input), initialValue: input.initialValue };
}

export function buildAccountUpdate(input: UpdateAccountInput): UpdateAccount {
    const description = input.description?.trim();
    if (!description) {
        throw new ValidationError('Account description cannot be empty');
    }
    return {
        id: newId(),
        description,
        currency: input.currency,
        startDate: input.startDate,
        archivedAt: input.archivedAt ?? null,
    };
}
