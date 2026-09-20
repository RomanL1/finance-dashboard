import {
    integer,
    primaryKey,
    sqliteTable,
    text,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { household } from '../../household/model/household.schema.js';
import { category } from '../../category/model/category.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

/**
 * Spending limit of one category for one calendar month. Belongs to a household through
 * its category. No row means "no limit"; an amount of 0 is a deliberate zero limit.
 */
export const budget = sqliteTable(
    'budget',
    {
        id: text('id').primaryKey(),
        categoryId: text('category_id')
            .notNull()
            .references(() => category.id, { onDelete: 'cascade' }),
        /** `YYYY-MM`. Text keeps it sortable and free of timezone math. */
        month: text('month').notNull(),
        /** Minor units of the household currency, never negative. */
        amount: integer('amount').notNull(),

        ...timestamps,
    },
    (table) => [
        uniqueIndex('budget_category_id_month_idx').on(
            table.categoryId,
            table.month,
        ),
    ],
);

/**
 * A month whose limits the household has touched: set, removed or taken over. Such a month never
 * fills itself again, so removing its last limit leaves it deliberately unbudgeted (stories S1, S3).
 */
export const budgetMonth = sqliteTable(
    'budget_month',
    {
        householdId: text('household_id')
            .notNull()
            .references(() => household.id, { onDelete: 'cascade' }),
        /** `YYYY-MM`. */
        month: text('month').notNull(),
    },
    (table) => [primaryKey({ columns: [table.householdId, table.month] })],
);
