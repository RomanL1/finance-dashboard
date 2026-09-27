import { Injectable } from '@angular/core';
import {
    recurringCreateRecurringTransaction,
    recurringDeleteRecurringTransaction,
    recurringGetRecurringTransactions,
    recurringPauseRecurringTransaction,
    recurringResumeRecurringTransaction,
    recurringUpdateRecurringTransaction,
} from '../../../core/api';
import type {
    RecurringTransactionDto,
    SaveRecurringTransactionDto,
} from '../recurring.types';

@Injectable({ providedIn: 'root' })
export class RecurringService {
    async list(householdId: string): Promise<RecurringTransactionDto[]> {
        const response = await recurringGetRecurringTransactions({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }

    /** Past occurrences since the start date are booked by the server right away. */
    async create(
        householdId: string,
        body: SaveRecurringTransactionDto,
    ): Promise<RecurringTransactionDto> {
        const response = await recurringCreateRecurringTransaction({
            path: { householdId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    async update(
        householdId: string,
        recurringTransactionId: string,
        body: SaveRecurringTransactionDto,
    ): Promise<RecurringTransactionDto> {
        const response = await recurringUpdateRecurringTransaction({
            path: { householdId, recurringTransactionId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    async setPaused(
        householdId: string,
        recurringTransactionId: string,
        paused: boolean,
    ): Promise<RecurringTransactionDto> {
        const call = paused
            ? recurringPauseRecurringTransaction
            : recurringResumeRecurringTransaction;
        const response = await call({
            path: { householdId, recurringTransactionId },
            throwOnError: true,
        });
        return response.data;
    }

    /** Transactions it created stay. */
    async delete(
        householdId: string,
        recurringTransactionId: string,
    ): Promise<void> {
        await recurringDeleteRecurringTransaction({
            path: { householdId, recurringTransactionId },
            throwOnError: true,
        });
    }
}
