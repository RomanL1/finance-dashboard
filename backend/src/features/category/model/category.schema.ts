import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { household } from '../../household/model/household.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

export const category = sqliteTable(
    'category',
    {
        id: text('id').primaryKey(),
        householdId: text('household_id')
            .notNull()
            .references(() => household.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),

        ...timestamps,
    },
    (table) => [
        uniqueIndex('category_household_id_name_idx').on(
            table.householdId,
            table.name,
        ),
    ],
);
