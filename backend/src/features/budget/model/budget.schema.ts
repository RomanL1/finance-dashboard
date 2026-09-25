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
 * Spending limit of one category for one calendar month. No row means "no limit";
 * an amount of 0 is a deliberate zero limit.
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

/** Months whose limits were set, removed or taken over; the automatic take-over skips them. See ADR-2. */
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
