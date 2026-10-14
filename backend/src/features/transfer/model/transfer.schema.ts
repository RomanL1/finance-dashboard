import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { financeAccount } from '../../account/model/account.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

/**
 * Money moved between two accounts of the same household, e.g. paying off a credit card.
 * Changes both balances and nothing else: income, expense and budget figures never read it.
 */
export const transfer = sqliteTable(
    'transfer',
    {
        id: text('id').primaryKey(),
        /** Pays: its balance goes down. */
        fromAccountId: text('from_account_id')
            .notNull()
            .references(() => financeAccount.id, { onDelete: 'restrict' }),
        /** Receives: its balance goes up. Same household as `fromAccountId` (service rule). */
        toAccountId: text('to_account_id')
            .notNull()
            .references(() => financeAccount.id, { onDelete: 'restrict' }),
        /** Minor units (cents), always positive. Currency is the household's. */
        amount: integer('amount').notNull(),
        title: text('title'),
        date: integer('date', { mode: 'timestamp' }).notNull(),

        ...timestamps,
    },
    (table) => [
        index('transfer_from_account_id_date_idx').on(
            table.fromAccountId,
            table.date,
        ),
        index('transfer_to_account_id_date_idx').on(
            table.toAccountId,
            table.date,
        ),
    ],
);
