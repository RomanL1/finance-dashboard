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
    amount: number;
    startDate: Date;
}

/** Domain model. Independent of persistence and transport shapes. */
export interface Account {
    id: Id;
    householdId: Id;
    description: string;
    currency: string;
    initialValue: number;
    amount: number;
    startDate: Date;
    createdAt: Date;
}

export interface CreateAccountInput {
    description: string;
    currency?: string;
    initialValue: number;
    startDate: Date;
}

/**
 * Domain rules for a new account, independent of how it is persisted.
 * `householdCurrency` is the fallback when the input leaves the currency open.
 */
export function buildAccount(
    input: CreateAccountInput,
    householdCurrency: string,
): CreateAccount {
    const description = input.description?.trim();
    if (!description) {
        throw new ValidationError('Account description cannot be empty');
    }
    return {
        id: newId(),
        description,
        currency: input.currency ?? householdCurrency,
        initialValue: input.initialValue,
        amount: input.initialValue,
        startDate: input.startDate,
    };
}
