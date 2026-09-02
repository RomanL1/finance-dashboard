import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Category, CreateOrUpdateCategory } from '../model/category.js';
import { Id } from '../../../shared/kernel/index.js';
import { category } from '../model/category.schema.js';

@Injectable()
export class CategoryRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async listByHouseholdId(householdId: Id): Promise<Category[]> {
        const rows = await this.db
            .select()
            .from(category)
            .where(eq(category.householdId, householdId));

        return rows ?? [];
    }

    async findById(householdId: Id, id: Id): Promise<Category | null> {
        const [row] = await this.db
            .select()
            .from(category)
            .where(
                and(eq(category.id, id), eq(category.householdId, householdId)),
            )
            .limit(1);
        return row ?? null;
    }

    async findByName(householdId: Id, name: string): Promise<Category | null> {
        const [row] = await this.db
            .select()
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
            .returning();
        return row;
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
            .returning();
        return row ?? null;
    }

    async deleteCategory(householdId: Id, id: Id): Promise<boolean> {
        const deleted = await this.db
            .delete(category)
            .where(
                and(eq(category.id, id), eq(category.householdId, householdId)),
            )
            .returning();
        return deleted.length > 0;
    }
}
