import { Injectable } from '@angular/core';
import {
    transactionConfirmTransaction,
    transactionCreateTransaction,
    transactionDeleteTransaction,
    transactionGetTransactions,
    transactionUpdateTransaction,
} from '../../../core/api';
import type { CreateTransactionDto, TransactionDto } from '../../../core/api';
import type {
    TransactionDefaults,
    TransactionPageDto,
    TransactionQuery,
} from '../transaction.types';

const LAST_USED_KEY = 'transaction-last-used';

@Injectable({ providedIn: 'root' })
export class TransactionService {
    /** `pageSize` omitted = server default. `range` narrows by date: `from` inclusive, `before` exclusive. */
    async list(
        householdId: string,
        query: TransactionQuery,
        pageSize?: number,
        range: { from?: Date; before?: Date } = {},
    ): Promise<TransactionPageDto> {
        const response = await transactionGetTransactions({
            path: { householdId },
            query: {
                accountId: query.accountId,
                categoryId: query.categoryId,
                needsConfirmation: query.needsConfirmation,
                from: range.from?.toISOString(),
                before: range.before?.toISOString(),
                page: query.page,
                pageSize,
            },
            throwOnError: true,
        });
        return response.data;
    }

    async create(
        householdId: string,
        body: CreateTransactionDto,
    ): Promise<TransactionDto> {
        const response = await transactionCreateTransaction({
            path: { householdId },
            body,
            throwOnError: true,
        });
        this.rememberLastUsed(body);
        return response.data;
    }

    async update(
        householdId: string,
        transactionId: string,
        body: CreateTransactionDto,
    ): Promise<TransactionDto> {
        const response = await transactionUpdateTransaction({
            path: { householdId, transactionId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    /** Accepts the amount a varying-amount recurring transaction booked. */
    async confirm(
        householdId: string,
        transactionId: string,
    ): Promise<TransactionDto> {
        const response = await transactionConfirmTransaction({
            path: { householdId, transactionId },
            throwOnError: true,
        });
        return response.data;
    }

    async delete(householdId: string, transactionId: string): Promise<void> {
        await transactionDeleteTransaction({
            path: { householdId, transactionId },
            throwOnError: true,
        });
    }

    /** Account and category of the last saved transaction, so the next entry is one tap shorter. */
    lastUsed(): TransactionDefaults {
        try {
            const raw = localStorage.getItem(LAST_USED_KEY);
            return raw ? (JSON.parse(raw) as TransactionDefaults) : {};
        } catch {
            return {};
        }
    }

    private rememberLastUsed(body: CreateTransactionDto): void {
        const defaults: TransactionDefaults = {
            accountId: body.accountId,
            categoryId: body.categoryId ?? null,
        };
        try {
            localStorage.setItem(LAST_USED_KEY, JSON.stringify(defaults));
        } catch {
            /* localStorage unavailable (private mode) — no preselect next time */
        }
    }
}
