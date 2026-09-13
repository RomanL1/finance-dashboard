import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import {
    CategoryDayExpense,
    CreateTransaction,
    CurrencyDaySums,
    DateRange,
    Transaction,
} from '../model/transaction.js';
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

    /** Grouped by the account's currency; archived accounts count, their history is still history. */
    /** Income and expense sums per (currency, UTC day) in the range. */
    async sumByCurrencyAndDay(
        householdId: Id,
        range: DateRange,
    ): Promise<CurrencyDaySums[]> {
        const day = sql<string>`date(${transaction.date}, 'unixepoch')`;
        const income = sql<number>`coalesce(sum(case when ${transaction.type} = 'income' then ${transaction.amount} else 0 end), 0)`;
        const expenses = sql<number>`coalesce(sum(case when ${transaction.type} = 'expense' then ${transaction.amount} else 0 end), 0)`;
        return this.db
            .select({
                currency: financeAccount.currency,
                day,
                income: income.mapWith(Number),
                expenses: expenses.mapWith(Number),
            })
            .from(transaction)
            .innerJoin(
                financeAccount,
                eq(transaction.accountId, financeAccount.id),
            )
            .where(
                and(
                    eq(financeAccount.householdId, householdId),
                    gte(transaction.date, range.from),
                    lt(transaction.date, range.to),
                ),
            )
            .groupBy(financeAccount.currency, day);
    }

    /** Expense sums per (currency, category, UTC day) in the range. Uncategorized rows carry null ids. */
    async sumExpensesByCategoryAndDay(
        householdId: Id,
        range: DateRange,
    ): Promise<CategoryDayExpense[]> {
        const day = sql<string>`date(${transaction.date}, 'unixepoch')`;
        const expenses = sql<number>`sum(${transaction.amount})`;
        const rows = await this.db
            .select({
                currency: financeAccount.currency,
                categoryId: transaction.categoryId,
                categoryName: category.name,
                day,
                expenses: expenses.mapWith(Number),
            })
            .from(transaction)
            .innerJoin(
                financeAccount,
                eq(transaction.accountId, financeAccount.id),
            )
            .leftJoin(category, eq(transaction.categoryId, category.id))
            .where(
                and(
                    eq(financeAccount.householdId, householdId),
                    eq(transaction.type, 'expense'),
                    gte(transaction.date, range.from),
                    lt(transaction.date, range.to),
                ),
            )
            .groupBy(financeAccount.currency, transaction.categoryId, day);
        return rows;
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
