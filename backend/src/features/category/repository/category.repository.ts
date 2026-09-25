import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
    Category,
    CreateOrUpdateCategory,
    DeleteCategoryOptions,
} from '../model/category.js';
import { Id } from '../../../shared/kernel/index.js';
import { category } from '../model/category.schema.js';
import { transaction } from '../../transaction/model/transaction.schema.js';

/**
 * Category rows plus their live transaction count. The count is read here rather than
 * through the transaction feature so the list is one query and the delete is one transaction.
 */
const categoryWithCount = {
    id: category.id,
    name: category.name,
    createdAt: category.createdAt,
    transactionCount: sql<number>`(
        select count(*) from ${transaction}
        where ${transaction.categoryId} = ${category.id}
    )`.mapWith(Number),
};

@Injectable()
export class CategoryRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async listByHouseholdId(householdId: Id): Promise<Category[]> {
        return this.db
            .select(categoryWithCount)
            .from(category)
            .where(eq(category.householdId, householdId))
            .orderBy(asc(category.name));
    }

    async findById(householdId: Id, id: Id): Promise<Category | null> {
        const [row] = await this.db
            .select(categoryWithCount)
            .from(category)
            .where(
                and(eq(category.id, id), eq(category.householdId, householdId)),
            )
            .limit(1);
        return row ?? null;
    }

    async findByName(householdId: Id, name: string): Promise<Category | null> {
        const [row] = await this.db
            .select(categoryWithCount)
            .from(category)
            .where(
                and(
                    eq(category.householdId, householdId),
                    eq(category.name, name),
                ),
            )
            .limit(1);
        return row ?? null;
    }

    async createCategory(
        entity: CreateOrUpdateCategory,
        householdId: Id,
    ): Promise<Category> {
        const [row] = await this.db
            .insert(category)
            .values({
                householdId: householdId,
                ...entity,
            })
            .returning({
                id: category.id,
                name: category.name,
                createdAt: category.createdAt,
            });
        return { ...row, transactionCount: 0 };
    }

    async renameCategory(
        householdId: Id,
        entity: CreateOrUpdateCategory,
    ): Promise<Category | null> {
        const [row] = await this.db
            .update(category)
            .set({ name: entity.name })
            .where(
                and(
                    eq(category.id, entity.id),
                    eq(category.householdId, householdId),
                ),
            )
            .returning({ id: category.id });
        if (!row) return null;
        return this.findById(householdId, row.id);
    }

    /**
     * With `transferTo`, the category's transactions are reassigned atomically with the delete.
     * Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
     * Both ids must already be validated as belonging to `householdId`.
     */
    async deleteCategory(
        householdId: Id,
        id: Id,
        options: DeleteCategoryOptions = {},
    ): Promise<boolean> {
        const remove = this.db
            .delete(category)
            .where(
                and(eq(category.id, id), eq(category.householdId, householdId)),
            )
            .returning({ id: category.id });

        if (!options.transferTo) {
            return (await remove).length > 0;
        }

        const [, deleted] = await this.db.batch([
            this.db
                .update(transaction)
                .set({ categoryId: options.transferTo })
                .where(eq(transaction.categoryId, id)),
            remove,
        ]);
        return deleted.length > 0;
    }
}
