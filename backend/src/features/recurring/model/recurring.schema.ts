import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { financeAccount } from '../../account/model/account.schema.js';
import { category } from '../../category/model/category.schema.js';
import { TRANSACTION_TYPES } from '../../transaction/model/transaction-type.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

export const RECURRENCE_INTERVALS = [
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly',
] as const;

/**
 * Rule that books a transaction on every occurrence (stories C6–C11).
 * Dates are calendar dates (`YYYY-MM-DD`) in the household's time zone.
 */
export const recurringTransaction = sqliteTable(
    'recurring_transaction',
    {
        id: text('id').primaryKey(),
        /** Restrict: an account with rules cannot be deleted (the service says so first). */
        accountId: text('account_id')
            .notNull()
            .references(() => financeAccount.id, { onDelete: 'restrict' }),
        categoryId: text('category_id').references(() => category.id, {
            onDelete: 'set null',
        }),
        type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
        /** Minor units, positive. For a varying amount the expected value. */
        amount: integer('amount').notNull(),
        title: text('title'),
        description: text('description'),
        interval: text('interval', { enum: RECURRENCE_INTERVALS }).notNull(),
        /** Weekly only: ISO weekday, 1 = Monday … 7 = Sunday. */
        weekday: integer('weekday'),
        /** Monthly and longer only: 1–31, clamped to shorter months. */
        dayOfMonth: integer('day_of_month'),
        startDate: text('start_date').notNull(),
        varyingAmount: integer('varying_amount', { mode: 'boolean' })
            .notNull()
            .default(false),
        /** Monthly and longer only: Saturday/Sunday occurrences book on the Friday before. */
        weekendShift: integer('weekend_shift', { mode: 'boolean' })
            .notNull()
            .default(false),
        paused: integer('paused', { mode: 'boolean' }).notNull().default(false),
        /** Cursor: next occurrence on the schedule, unshifted. */
        nextOccurrence: text('next_occurrence').notNull(),
        /** `nextOccurrence` after the weekend shift: the day it gets booked. */
        nextDueDate: text('next_due_date').notNull(),
        /** Every occurrence on or before this date is passed (booked or skipped); edits continue after it. */
        lastOccurrence: text('last_occurrence'),

        ...timestamps,
    },
    (table) => [
        index('recurring_transaction_account_id_idx').on(table.accountId),
        index('recurring_transaction_next_due_date_idx').on(table.nextDueDate),
    ],
);
