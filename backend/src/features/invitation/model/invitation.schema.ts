import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from '../../../shared/infra/db/timestamp.schema.js';
import { household } from '../../household/model/household.schema.js';

/** An open invitation. Accepting or revoking deletes the row, so every row is unused. */
export const householdInvitation = sqliteTable('household_invitation', {
    id: text('id').primaryKey(),
    householdId: text('household_id')
        .notNull()
        .references(() => household.id, { onDelete: 'cascade' }),
    /** SHA-256 of the link token; the token itself is only ever shown to the owner once. */
    tokenHash: text('token_hash').notNull().unique(),
    /** Owner's reminder who the link is for; never shown to the invitee. */
    note: text('note'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),

    ...timestamps,
});
