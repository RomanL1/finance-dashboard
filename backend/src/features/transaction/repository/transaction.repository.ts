import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import {
    and,
    count,
    desc,
    eq,
    gte,
    inArray,
    isNull,
    lt,
    sql,
} from 'drizzle-orm';
import {
    CategoryExpense,
    CreateTransaction,
    DateRange,
    RangeSums,
    Transaction,
    TransactionFilter,
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

    /** Household rows narrowed by the filter; `and()` drops the undefined parts. */
    private matching(householdId: Id, filter: TransactionFilter) {
        return and(
            this.inHousehold(householdId),
            filter.accountId
                ? eq(transaction.accountId, filter.accountId)
                : undefined,
            filter.categoryId === null
                ? isNull(transaction.categoryId)
                : filter.categoryId
                  ? eq(transaction.categoryId, filter.categoryId)
                  : undefined,
        );
    }

    /** Newest first; `createdAt` breaks ties so pages never overlap. */
    async listByHouseholdId(
        householdId: Id,
        filter: TransactionFilter,
        limit: number,
        offset: number,
    ): Promise<Transaction[]> {
        return await this.db
            .select(this.columns)
            .from(transaction)
            .where(this.matching(householdId, filter))
            .orderBy(desc(transaction.date), desc(transaction.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async countByHouseholdId(
        householdId: Id,
        filter: TransactionFilter,
    ): Promise<number> {
        const [row] = await this.db
            .select({ total: count() })
            .from(transaction)
            .where(this.matching(householdId, filter));
        return row?.total ?? 0;
    }

    /** Income and expense sums in the range; archived accounts count, their history is still history. */
    async sumByRange(householdId: Id, range: DateRange): Promise<RangeSums> {
        const income = sql<number>`coalesce(sum(case when ${transaction.type} = 'income' then ${transaction.amount} else 0 end), 0)`;
        const expenses = sql<number>`coalesce(sum(case when ${transaction.type} = 'expense' then ${transaction.amount} else 0 end), 0)`;
        const [row] = await this.db
            .select({
                income: income.mapWith(Number),
                expenses: expenses.mapWith(Number),
            })
            .from(transaction)
            .where(
                and(
                    this.inHousehold(householdId),
                    gte(transaction.date, range.from),
                    lt(transaction.date, range.to),
                ),
            );
        return row ?? { income: 0, expenses: 0 };
    }

    /** Expense sums per category in the range. Uncategorized rows carry null ids. */
    async sumExpensesByCategory(
        householdId: Id,
        range: DateRange,
    ): Promise<CategoryExpense[]> {
        const expenses = sql<number>`sum(${transaction.amount})`;
        return this.db
            .select({
                categoryId: transaction.categoryId,
                categoryName: category.name,
                expenses: expenses.mapWith(Number),
            })
            .from(transaction)
            .leftJoin(category, eq(transaction.categoryId, category.id))
            .where(
                and(
                    this.inHousehold(householdId),
                    eq(transaction.type, 'expense'),
                    gte(transaction.date, range.from),
                    lt(transaction.date, range.to),
                ),
            )
            .groupBy(transaction.categoryId, category.name);
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
