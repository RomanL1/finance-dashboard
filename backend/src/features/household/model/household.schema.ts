import { sql } from 'drizzle-orm';
import {
    integer,
    primaryKey,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core';
import { user } from '../../../shared/infra/auth/auth.schema.js';

export const HOUSEHOLD_ROLES = ['owner', 'member'] as const;

export const household = sqliteTable('household', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    currency: text('currency').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
        .notNull(),
});

export const householdMember = sqliteTable(
    'household_member',
    {
        householdId: text('household_id')
            .notNull()
            .references(() => household.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        role: text('role', { enum: HOUSEHOLD_ROLES }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);
