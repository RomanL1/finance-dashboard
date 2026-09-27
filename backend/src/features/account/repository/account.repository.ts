import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { Account, CreateAccount, UpdateAccount } from '../model/account.js';
import { Id } from '../../../shared/kernel/index.js';
import { financeAccount, nextAccountNumber } from '../model/account.schema.js';
import { transaction } from '../../transaction/model/transaction.schema.js';
import { recurringTransaction } from '../../recurring/model/recurring.schema.js';

@Injectable()
export class AccountRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    /** Balance is derived: initial value plus signed transaction sum. */
    private readonly balance =
        sql<number>`${financeAccount.initialValue} + coalesce((
        select sum(case when ${transaction.type} = 'income' then ${transaction.amount} else -${transaction.amount} end)
        from ${transaction} where ${transaction.accountId} = ${financeAccount.id}
    ), 0)`.mapWith(Number);

    private readonly columns = {
        id: financeAccount.id,
        householdId: financeAccount.householdId,
        number: financeAccount.number,
        description: financeAccount.description,
        type: financeAccount.type,
        currency: financeAccount.currency,
        initialValue: financeAccount.initialValue,
        amount: this.balance,
        startDate: financeAccount.startDate,
        archivedAt: financeAccount.archivedAt,
        createdAt: financeAccount.createdAt,
    };

    async listByHouseholdId(householdId: Id): Promise<Account[]> {
        return this.db
            .select(this.columns)
            .from(financeAccount)
            .where(eq(financeAccount.householdId, householdId));
    }

    async createAccount(
        entity: CreateAccount,
        householdId: Id,
    ): Promise<Account> {
        const [row] = await this.db
            .insert(financeAccount)
            .values({
                householdId: householdId,
                number: nextAccountNumber(householdId),
                ...entity,
            })
            .returning();
        return { ...row, amount: row.initialValue };
    }

    /**
     * Null when the row does not exist or belongs to another household. Archiving also
     * removes upcoming transactions recurring transactions booked from the archive date on:
     * an archived account takes no new entries. One batch: both or neither.
     */
    async updateAccount(
        householdId: Id,
        entity: UpdateAccount,
        now: Date,
    ): Promise<Account | null> {
        const update = this.db
            .update(financeAccount)
            .set(entity)
            .where(
                and(
                    eq(financeAccount.id, entity.id),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .returning({ id: financeAccount.id });
        const archivedAt = entity.archivedAt;
        let row: { id: string } | undefined;
        if (archivedAt) {
            // Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
            const [rows] = await this.db.batch([
                update,
                this.db
                    .delete(transaction)
                    .where(
                        and(
                            eq(transaction.accountId, entity.id),
                            isNotNull(transaction.recurringTransactionId),
                            gte(transaction.date, archivedAt),
                            gt(transaction.date, now),
                            inArray(
                                transaction.accountId,
                                this.db
                                    .select({ id: financeAccount.id })
                                    .from(financeAccount)
                                    .where(
                                        eq(
                                            financeAccount.householdId,
                                            householdId,
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ]);
            [row] = rows;
        } else {
            [row] = await update;
        }
        if (!row) return null;
        const [account] = await this.db
            .select(this.columns)
            .from(financeAccount)
            .where(eq(financeAccount.id, row.id));
        return account ?? null;
    }

    async hasTransactions(householdId: Id, id: Id): Promise<boolean> {
        const [row] = await this.db
            .select({ id: transaction.id })
            .from(transaction)
            .innerJoin(
                financeAccount,
                eq(financeAccount.id, transaction.accountId),
            )
            .where(
                and(
                    eq(transaction.accountId, id),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    async hasRecurringTransactions(householdId: Id, id: Id): Promise<boolean> {
        const [row] = await this.db
            .select({ id: recurringTransaction.id })
            .from(recurringTransaction)
            .innerJoin(
                financeAccount,
                eq(financeAccount.id, recurringTransaction.accountId),
            )
            .where(
                and(
                    eq(recurringTransaction.accountId, id),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    /** Only reaches empty accounts: the service refuses the rest and the FK is `restrict`. */
    async deleteAccount(householdId: Id, id: Id): Promise<boolean> {
        const deleted = await this.db
            .delete(financeAccount)
            .where(
                and(
                    eq(financeAccount.id, id),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .returning({ id: financeAccount.id });
        return deleted.length > 0;
    }
}
