import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lt, max } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { type Id } from '../../../shared/kernel/index.js';
import { category } from '../../category/model/category.schema.js';
import { budget } from '../model/budget.schema.js';
import type { Budget, Month } from '../model/budget.js';

const budgetColumns = {
    id: budget.id,
    categoryId: budget.categoryId,
    month: budget.month,
    amount: budget.amount,
};

/** Every query joins the category so rows are scoped to the household without a redundant column. */
@Injectable()
export class BudgetRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async listByMonth(householdId: Id, month: Month): Promise<Budget[]> {
        return this.db
            .select(budgetColumns)
            .from(budget)
            .innerJoin(category, eq(category.id, budget.categoryId))
            .where(
                and(
                    eq(category.householdId, householdId),
                    eq(budget.month, month),
                ),
            )
            .orderBy(asc(category.name));
    }

    /** The most recent month before `month` that has at least one limit in the household, or null. */
    async latestMonthBefore(
        householdId: Id,
        month: Month,
    ): Promise<Month | null> {
        const [row] = await this.db
            .select({ month: max(budget.month) })
            .from(budget)
            .innerJoin(category, eq(category.id, budget.categoryId))
            .where(
                and(
                    eq(category.householdId, householdId),
                    lt(budget.month, month),
                ),
            );
        return row?.month ?? null;
    }

    /** One statement, so either every row lands or none. Rows must not collide with existing (category, month) pairs. */
    async insertMany(entities: Budget[]): Promise<Budget[]> {
        if (entities.length === 0) return [];
        return this.db.insert(budget).values(entities).returning(budgetColumns);
    }

    async find(
        householdId: Id,
        categoryId: Id,
        month: Month,
    ): Promise<Budget | null> {
        const [row] = await this.db
            .select(budgetColumns)
            .from(budget)
            .innerJoin(category, eq(category.id, budget.categoryId))
            .where(
                and(
                    eq(category.householdId, householdId),
                    eq(budget.categoryId, categoryId),
                    eq(budget.month, month),
                ),
            )
            .limit(1);
        return row ?? null;
    }

    /** Insert, or replace the amount of the existing (category, month) row. The category must already be verified. */
    async upsert(entity: Budget): Promise<Budget> {
        const [row] = await this.db
            .insert(budget)
            .values(entity)
            .onConflictDoUpdate({
                target: [budget.categoryId, budget.month],
                set: { amount: entity.amount },
            })
            .returning(budgetColumns);
        return row;
    }

    async delete(
        householdId: Id,
        categoryId: Id,
        month: Month,
    ): Promise<boolean> {
        const existing = await this.find(householdId, categoryId, month);
        if (!existing) return false;
        const deleted = await this.db
            .delete(budget)
            .where(eq(budget.id, existing.id))
            .returning({ id: budget.id });
        return deleted.length > 0;
    }
}
