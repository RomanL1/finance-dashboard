import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { financeAccount } from '../../account/model/account.schema.js';
import { category } from '../../category/model/category.schema.js';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';

export const TRANSACTION_TYPES = ['expense', 'income'] as const;

/** Belongs to a household through its account. No redundant household_id. */
export const transaction = sqliteTable(
    'transaction',
    {
        id: text('id').primaryKey(),
        accountId: text('account_id')
            .notNull()
            .references(() => financeAccount.id, { onDelete: 'restrict' }),
        categoryId: text('category_id')
            .notNull()
            .references(() => category.id, { onDelete: 'restrict' }),
        type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
        /** Minor units (cents), always positive; sign comes from `type`. Currency is the account's. */
        amount: integer('amount').notNull(),
        title: text('title').notNull(),
        description: text('description'),
        date: integer('date', { mode: 'timestamp' }).notNull(),

        ...timestamps,
    },
    (table) => [
        index('transaction_account_id_date_idx').on(
            table.accountId,
            table.date,
        ),
    ],
);
