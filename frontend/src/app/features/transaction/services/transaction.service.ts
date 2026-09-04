import { Injectable } from '@angular/core';
import {
    transactionCreateTransaction,
    transactionGetTransactions,
} from '../../../core/api';
import type { CreateTransactionDto, TransactionDto } from '../../../core/api';

@Injectable({ providedIn: 'root' })
export class TransactionService {
    async list(householdId: string): Promise<TransactionDto[]> {
        const response = await transactionGetTransactions({
            path: { householdId },
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
        return response.data;
    }
}
