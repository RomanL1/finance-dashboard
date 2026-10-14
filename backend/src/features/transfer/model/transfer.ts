import {
    newId,
    ValidationError,
    type Id,
} from '../../../shared/kernel/index.js';

export interface CreateTransfer {
    id: Id;
    fromAccountId: Id;
    toAccountId: Id;
    amount: number;
    title: string | null;
    date: Date;
}

export interface Transfer extends CreateTransfer {
    createdAt: Date;
}

export const PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface TransferFilter {
    /** Transfers from or to this account. */
    accountId?: Id;
}

/** One page of the household's transfers, newest first. */
export interface TransferPage {
    items: Transfer[];
    /** Matching rows across all pages. */
    total: number;
    /** 1-based */
    page: number;
    pageSize: number;
}

/** What the service needs to know about an account a transfer touches. */
export interface TransferAccount {
    id: Id;
    archivedAt: Date | null;
}

export interface CreateTransferInput {
    fromAccountId: Id;
    toAccountId: Id;
    amount: number;
    title?: string | null;
    date: Date;
}

export function buildTransfer(input: CreateTransferInput): CreateTransfer {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new ValidationError('Transfer amount must be a positive integer');
    }
    if (input.fromAccountId === input.toAccountId) {
        throw new ValidationError('Transfer needs two different accounts');
    }
    return {
        id: newId(),
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        title: input.title?.trim() || null,
        date: input.date,
    };
}

/** An archived account takes no entries from its archive date on. */
export function isActiveAt(account: TransferAccount, date: Date): boolean {
    return account.archivedAt === null || account.archivedAt > date;
}
