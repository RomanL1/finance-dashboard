import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CreateTransaction, Transaction } from '../model/transaction.js';
import { Id } from '../../../shared/kernel/index.js';
import { transaction } from '../model/transaction.schema.js';
import { financeAccount } from '../../account/model/account.schema.js';
import { category } from '../../category/model/category.schema.js';

@Injectable()
export class TransactionRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    private readonly columns = {
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        title: transaction.title,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
    };

    /** Rows whose account belongs to the household; scopes every mutation. */
    private inHousehold(householdId: Id) {
        return inArray(
            transaction.accountId,
            this.db
                .select({ id: financeAccount.id })
                .from(financeAccount)
                .where(eq(financeAccount.householdId, householdId)),
        );
    }

    async listByHouseholdId(householdId: Id): Promise<Transaction[]> {
        return await this.db
            .select(this.columns)
            .from(transaction)
            .where(this.inHousehold(householdId))
            .orderBy(desc(transaction.date));
    }

    async accountExists(householdId: Id, accountId: Id): Promise<boolean> {
        const [row] = await this.db
            .select({ id: financeAccount.id })
            .from(financeAccount)
            .where(
                and(
                    eq(financeAccount.id, accountId),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    async categoryExists(householdId: Id, categoryId: Id): Promise<boolean> {
        const [row] = await this.db
            .select({ id: category.id })
            .from(category)
            .where(
                and(
                    eq(category.id, categoryId),
                    eq(category.householdId, householdId),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    async createTransaction(entity: CreateTransaction): Promise<Transaction> {
        const [row] = await this.db
            .insert(transaction)
            .values(entity)
            .returning();
        return row;
    }

    /** Null when the row does not exist or belongs to another household. */
    async updateTransaction(
        householdId: Id,
        entity: CreateTransaction,
    ): Promise<Transaction | null> {
        const [row] = await this.db
            .update(transaction)
            .set(entity)
            .where(
                and(
                    eq(transaction.id, entity.id),
                    this.inHousehold(householdId),
                ),
            )
            .returning();
        return row ?? null;
    }

    async deleteTransaction(householdId: Id, id: Id): Promise<boolean> {
        const deleted = await this.db
            .delete(transaction)
            .where(and(eq(transaction.id, id), this.inHousehold(householdId)))
            .returning({ id: transaction.id });
        return deleted.length > 0;
    }
}
