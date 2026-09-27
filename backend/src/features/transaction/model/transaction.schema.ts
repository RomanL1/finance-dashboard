import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { financeAccount } from '../../account/model/account.schema.js';
import { category } from '../../category/model/category.schema.js';
import { recurringTransaction } from '../../recurring/model/recurring.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';
import { TRANSACTION_TYPES } from './transaction-type.js';

export { TRANSACTION_TYPES };

export const transaction = sqliteTable(
    'transaction',
    {
        id: text('id').primaryKey(),
        accountId: text('account_id')
            .notNull()
            .references(() => financeAccount.id, { onDelete: 'restrict' }),
        /** Optional: quick entry without picking one. Deleting the category uncategorizes. */
        categoryId: text('category_id').references(() => category.id, {
            onDelete: 'set null',
        }),
        type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
        /** Minor units (cents), always positive; sign comes from `type`. Currency is the account's. */
        amount: integer('amount').notNull(),
        /** Optional: the UI falls back to the category name. */
        title: text('title'),
        description: text('description'),
        date: integer('date', { mode: 'timestamp' }).notNull(),
        /** Set when a recurring transaction created the row. Deleting the rule keeps the row and drops the link (story C11). */
        recurringTransactionId: text('recurring_transaction_id').references(
            () => recurringTransaction.id,
            { onDelete: 'set null' },
        ),
        /** Created from a varying-amount rule and not yet confirmed or edited (story C9). */
        needsConfirmation: integer('needs_confirmation', { mode: 'boolean' })
            .notNull()
            .default(false),

        ...timestamps,
    },
    (table) => [
        index('transaction_account_id_date_idx').on(
            table.accountId,
            table.date,
        ),
        index('transaction_category_id_idx').on(table.categoryId),
        index('transaction_recurring_transaction_id_idx').on(
            table.recurringTransactionId,
        ),
    ],
);
