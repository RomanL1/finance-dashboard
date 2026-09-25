import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lt, max } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { type Id } from '../../../shared/kernel/index.js';
import { category } from '../../category/model/category.schema.js';
import { budget, budgetMonth } from '../model/budget.schema.js';
import type { Budget, Month } from '../model/budget.js';

const budgetColumns = {
    id: budget.id,
    categoryId: budget.categoryId,
    month: budget.month,
    amount: budget.amount,
};

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

    async isMonthTouched(householdId: Id, month: Month): Promise<boolean> {
        const [row] = await this.db
            .select({ month: budgetMonth.month })
            .from(budgetMonth)
            .where(
                and(
                    eq(budgetMonth.householdId, householdId),
                    eq(budgetMonth.month, month),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    /**
     * Inserts copies into `month` and marks it touched in one batch (ADR-3), so copies never
     * exist without the marker. Rows must not collide with existing (category, month) pairs.
     */
    async insertMany(
        householdId: Id,
        month: Month,
        entities: Budget[],
    ): Promise<Budget[]> {
        if (entities.length === 0) {
            await this.touch(householdId, month);
            return [];
        }
        const [rows] = await this.db.batch([
            this.db.insert(budget).values(entities).returning(budgetColumns),
            this.touch(householdId, month),
        ]);
        return rows;
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

    /**
     * Insert, or replace the amount of the existing (category, month) row, and mark the month
     * touched in the same batch (ADR-3). The category must already be verified.
     */
    async upsert(householdId: Id, entity: Budget): Promise<Budget> {
        const [[row]] = await this.db.batch([
            this.db
                .insert(budget)
                .values(entity)
                .onConflictDoUpdate({
                    target: [budget.categoryId, budget.month],
                    set: { amount: entity.amount },
                })
                .returning(budgetColumns),
            this.touch(householdId, entity.month),
        ]);
        return row;
    }

    async delete(
        householdId: Id,
        categoryId: Id,
        month: Month,
    ): Promise<boolean> {
        const existing = await this.find(householdId, categoryId, month);
        if (!existing) return false;
        // One batch (ADR-3): removing the last limit must also mark the month, or the automatic
        // take-over would refill it (ADR-2). The marker also covers months that predate it.
        const [deleted] = await this.db.batch([
            this.db
                .delete(budget)
                .where(eq(budget.id, existing.id))
                .returning({ id: budget.id }),
            this.touch(householdId, month),
        ]);
        return deleted.length > 0;
    }

    /** Marks `month` as touched (ADR-2). Idempotent; returned unexecuted so callers can batch it. */
    private touch(householdId: Id, month: Month) {
        return this.db
            .insert(budgetMonth)
            .values({ householdId, month })
            .onConflictDoNothing();
    }
}
