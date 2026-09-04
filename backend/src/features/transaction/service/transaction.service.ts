import { Inject, Injectable } from '@nestjs/common';
import { TransactionRepository } from '../repository/transaction.repository.js';
import {
    buildTransaction,
    CreateTransaction,
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
        await this.assertReferences(householdId, entity);
        return this.transactions.createTransaction(entity);
    }

    /** Full replace: every field comes from the input, only the id survives. */
    async update(
        householdId: Id,
        id: Id,
        input: CreateTransactionInput,
    ): Promise<Transaction> {
        const entity = { ...buildTransaction(input), id };
        await this.assertReferences(householdId, entity);
        const updated = await this.transactions.updateTransaction(
            householdId,
            entity,
        );
        if (!updated) throw new NotFoundError('Transaction', id);
        return updated;
    }

    async delete(householdId: Id, id: Id): Promise<void> {
        if (!(await this.transactions.deleteTransaction(householdId, id))) {
            throw new NotFoundError('Transaction', id);
        }
    }

    private async assertReferences(
        householdId: Id,
        entity: CreateTransaction,
    ): Promise<void> {
        if (
            !(await this.transactions.accountExists(
                householdId,
                entity.accountId,
            ))
        ) {
            throw new NotFoundError('Account', entity.accountId);
        }
        if (
            entity.categoryId &&
            !(await this.transactions.categoryExists(
                householdId,
                entity.categoryId,
            ))
        ) {
            throw new NotFoundError('Category', entity.categoryId);
        }
    }
}
