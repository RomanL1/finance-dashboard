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

export interface Transaction extends CreateTransaction {
    createdAt: Date;
}

/** Sentinel for "uncategorized" in the category filter, since the wire cannot carry null in a query string. */
export const UNCATEGORIZED = 'none';

export const PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/** Every field optional; `categoryId: null` selects uncategorized rows. */
export interface TransactionFilter {
    accountId?: Id;
    categoryId?: Id | null;
}

/** One page of the household history, newest first. */
export interface TransactionPage {
    items: Transaction[];
    /** Matching rows across all pages. */
    total: number;
    /** 1-based */
    page: number;
    pageSize: number;
}

/** Half-open interval: `from` inclusive, `to` exclusive. */
export interface DateRange {
    from: Date;
    to: Date;
}

/** Income and expense sums over a range. Minor units. */
export interface RangeSums {
    income: number;
    expenses: number;
}

/** Sums over a date range in the household currency. Minor units. */
export interface CurrencyStats {
    currency: string;
    income: number;
    expenses: number;
    net: number;
}

export interface CategoryExpense {
    categoryId: Id | null;
    /** Null for uncategorized entries. */
    categoryName: string | null;
    /** Minor units of the household currency. */
    expenses: number;
}

/** Expenses per category over a range in the household currency. Sorted by expenses, descending. */
export interface CategoryStats {
    currency: string;
    categories: CategoryExpense[];
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
