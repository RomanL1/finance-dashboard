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
    createdAt: Date;
}

export interface CreateAccountInput {
    description: string;
    currency: string;
    initialValue: number;
    startDate: Date;
}

/** Domain rules for a new account, independent of how it is persisted. */
export function buildAccount(input: CreateAccountInput): CreateAccount {
    const description = input.description?.trim();
    if (!description) {
        throw new ValidationError('Account description cannot be empty');
    }
    return {
        id: newId(),
        description,
        currency: input.currency,
        initialValue: input.initialValue,
        startDate: input.startDate,
    };
}
