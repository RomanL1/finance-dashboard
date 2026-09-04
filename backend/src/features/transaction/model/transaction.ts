import {
    newId,
    ValidationError,
    type Id,
} from '../../../shared/kernel/index.js';
import { TRANSACTION_TYPES } from './transaction.schema.js';

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface CreateTransaction {
    id: Id;
    accountId: Id;
    categoryId: Id | null;
    type: TransactionType;
    amount: number;
    title: string | null;
    description: string | null;
    date: Date;
}

/** Domain model. Independent of persistence and transport shapes. */
export interface Transaction extends CreateTransaction {
    createdAt: Date;
}

export interface CreateTransactionInput {
    accountId: Id;
    categoryId?: Id | null;
    type: TransactionType;
    amount: number;
    title?: string | null;
    description?: string | null;
    date: Date;
}

/** Signed effect on the account balance. */
export function balanceDelta(
    t: Pick<CreateTransaction, 'type' | 'amount'>,
): number {
    return t.type === 'income' ? t.amount : -t.amount;
}

/** Domain rules for a new transaction, independent of how it is persisted. */
export function buildTransaction(
    input: CreateTransactionInput,
): CreateTransaction {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new ValidationError(
            'Transaction amount must be a positive integer',
        );
    }
    return {
        id: newId(),
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount: input.amount,
        title: input.title?.trim() || null,
        description: input.description?.trim() || null,
        date: input.date,
    };
}
