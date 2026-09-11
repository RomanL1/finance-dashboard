import {
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { household } from '../../household/model/household.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

/** Named financeAccount / finance_account: better-auth already owns `account`. */
export const financeAccount = sqliteTable(
    'finance_account',
    {
        id: text('id').primaryKey(),
        householdId: text('household_id')
            .notNull()
            .references(() => household.id, { onDelete: 'cascade' }),
        /** Per-household running number, assigned at insert (`max + 1`). Only the highest number is freed by a delete. Shown as a badge. */
        number: integer('number').notNull(),
        description: text('description').notNull(),
        currency: text('currency').notNull(),
        /** Minor units (cents), fixed starting balance. */
        initialValue: integer('initial_value').notNull(),
        startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
        /** Null = active. Set = inactive from that date on. */
        archivedAt: integer('archived_at', { mode: 'timestamp' }),

        ...timestamps,
    },
    (table) => [
        uniqueIndex('finance_account_household_id_number_idx').on(
            table.householdId,
            table.number,
        ),
    ],
);

/** `max(number) + 1` within the household. Evaluated by sqlite at insert time, so batches stay consistent. */
export function nextAccountNumber(householdId: string) {
    return sql<number>`coalesce((select max(${financeAccount.number}) from ${financeAccount} where ${financeAccount.householdId} = ${householdId}), 0) + 1`;
}
