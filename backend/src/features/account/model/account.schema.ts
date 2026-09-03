import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { household } from '../../household/model/household.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

/** Named financeAccount / finance_account: better-auth already owns `account`. */
export const financeAccount = sqliteTable('finance_account', {
    id: text('id').primaryKey(),
    householdId: text('household_id')
        .notNull()
        .references(() => household.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    currency: text('currency').notNull(),
    /** Minor units (cents), fixed starting balance. */
    initialValue: integer('initial_value').notNull(),
    /** Minor units (cents), current balance. Equals initialValue at creation. */
    amount: integer('amount').notNull(),
    startDate: integer('start_date', { mode: 'timestamp' }).notNull(),

    ...timestamps,
});
