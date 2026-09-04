import { Inject, Injectable } from '@nestjs/common';
import { TransactionRepository } from '../repository/transaction.repository.js';
import {
    buildTransaction,
    CreateTransactionInput,
    Transaction,
} from '../model/transaction.js';
import { Id, NotFoundError } from '../../../shared/kernel/index.js';

@Injectable()
export class TransactionService {
    constructor(
        @Inject() private readonly transactions: TransactionRepository,
    ) {}

    async getAll(householdId: Id): Promise<Transaction[]> {
        return this.transactions.listByHouseholdId(householdId);
    }

    async create(
        householdId: Id,
        input: CreateTransactionInput,
    ): Promise<Transaction> {
        const entity = buildTransaction(input);
        if (
            !(await this.transactions.accountExists(
                householdId,
                entity.accountId,
            ))
        ) {
            throw new NotFoundError('Account', entity.accountId);
        }
        if (
            !(await this.transactions.categoryExists(
                householdId,
                entity.categoryId,
            ))
        ) {
            throw new NotFoundError('Category', entity.categoryId);
        }
        // ponytail: balance is a mutable counter adjusted here. Update/delete endpoints must reverse it in the same tx, or switch to initialValue - sum(transactions).
        return this.transactions.createTransaction(entity);
    }
}
