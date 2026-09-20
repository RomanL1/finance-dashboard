import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { Account, CreateAccount, UpdateAccount } from '../model/account.js';
import { Id } from '../../../shared/kernel/index.js';
import { financeAccount, nextAccountNumber } from '../model/account.schema.js';
import { transaction } from '../../transaction/model/transaction.schema.js';

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

    /** Null when the row does not exist or belongs to another household. */
    async updateAccount(
        householdId: Id,
        entity: UpdateAccount,
    ): Promise<Account | null> {
        const [row] = await this.db
            .update(financeAccount)
            .set(entity)
            .where(
                and(
                    eq(financeAccount.id, entity.id),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .returning({ id: financeAccount.id });
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
