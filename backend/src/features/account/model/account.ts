import {
    newId,
    ValidationError,
    type Id,
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
    description: string;
    currency: string;
    initialValue: number;
    /** Current balance: initialValue plus the signed sum of its transactions. Computed, never stored. */
    amount: number;
    startDate: Date;
    archivedAt: Date | null;
    createdAt: Date;
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
