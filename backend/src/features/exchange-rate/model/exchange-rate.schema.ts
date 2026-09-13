import { primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Daily reference rates mirrored from the rate provider (Frankfurter v2: `{date, base, quote, rate}`).
 * `rate` = how many `quote` units one `base` unit buys on `date`. Global, not per household:
 * rates are public data, so every household shares one copy and the provider is asked once a day.
 */
export const exchangeRate = sqliteTable(
    'exchange_rate',
    {
        base: text('base').notNull(),
        quote: text('quote').notNull(),
        /** Calendar day, `YYYY-MM-DD`. Text keeps lookups (`<=`) and the provider format identical. */
        date: text('date').notNull(),
        rate: real('rate').notNull(),
    },
    (table) => [primaryKey({ columns: [table.base, table.quote, table.date] })],
);
