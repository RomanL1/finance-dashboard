import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
    balanceDelta,
    CreateTransaction,
    Transaction,
} from '../model/transaction.js';
import { Id } from '../../../shared/kernel/index.js';
import { transaction } from '../model/transaction.schema.js';
import { financeAccount } from '../../account/model/account.schema.js';
import { category } from '../../category/model/category.schema.js';

@Injectable()
export class TransactionRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async listByHouseholdId(householdId: Id): Promise<Transaction[]> {
        return await this.db
            .select({
                id: transaction.id,
                accountId: transaction.accountId,
                categoryId: transaction.categoryId,
                type: transaction.type,
                amount: transaction.amount,
                title: transaction.title,
                description: transaction.description,
                date: transaction.date,
                createdAt: transaction.createdAt,
            })
            .from(transaction)
            .innerJoin(
                financeAccount,
                eq(transaction.accountId, financeAccount.id),
            )
            .where(eq(financeAccount.householdId, householdId))
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

    /** Inserts the row and applies its signed amount to the account balance in one db transaction. */
    async createTransaction(entity: CreateTransaction): Promise<Transaction> {
        return this.db.transaction(async (tx) => {
            const [row] = await tx
                .insert(transaction)
                .values(entity)
                .returning();
            await tx
                .update(financeAccount)
                .set({
                    amount: sql`${financeAccount.amount} + ${balanceDelta(entity)}`,
                })
                .where(eq(financeAccount.id, entity.accountId));
            return row;
        });
    }
}
