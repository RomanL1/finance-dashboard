import {
    integer,
    primaryKey,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core';
import { user } from '../../../shared/infra/auth/auth.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

export const HOUSEHOLD_ROLES = ['owner', 'member'] as const;

export const household = sqliteTable('household', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    onboardingComplete: integer('onboarding_complete', { mode: 'boolean' })
        .notNull()
        .default(false),

    ...timestamps,
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

        ...timestamps,
    },
    (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);
