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

/** Half-open interval: `from` inclusive, `to` exclusive. */
export interface DateRange {
    from: Date;
    to: Date;
}

/** Sums per currency over a date range, minor units. Accounts with different currencies never mix. */
export interface CurrencyStats {
    currency: string;
    income: number;
    expenses: number;
    /** `income - expenses` */
    net: number;
}

export function assertValidRange(range: DateRange): void {
    if (
        Number.isNaN(range.from.getTime()) ||
        Number.isNaN(range.to.getTime())
    ) {
        throw new ValidationError('Range dates must be valid');
    }
    if (range.to <= range.from) {
        throw new ValidationError('Range end must be after its start');
    }
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
