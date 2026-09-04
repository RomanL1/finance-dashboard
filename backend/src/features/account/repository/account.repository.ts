import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { Account, CreateAccount } from '../model/account.js';
import { Id } from '../../../shared/kernel/index.js';
import { financeAccount } from '../model/account.schema.js';
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

    async listByHouseholdId(householdId: Id): Promise<Account[]> {
        return this.db
            .select({
                id: financeAccount.id,
                householdId: financeAccount.householdId,
                description: financeAccount.description,
                currency: financeAccount.currency,
                initialValue: financeAccount.initialValue,
                amount: this.balance,
                startDate: financeAccount.startDate,
                createdAt: financeAccount.createdAt,
            })
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
                ...entity,
            })
            .returning();
        return { ...row, amount: row.initialValue };
    }
}
