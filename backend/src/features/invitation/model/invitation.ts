import { createHash, randomBytes } from 'node:crypto';
import type { Id } from '../../../shared/kernel/index.js';

/** A link is good for one day. */
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_OPEN_INVITATIONS = 10;
export const INVITATION_NOTE_MAX_LENGTH = 50;

export interface Invitation {
    id: Id;
    householdId: Id;
    note: string | null;
    expiresAt: Date;
    createdAt: Date;
}

/** The only moment the token exists in plain text. */
export interface CreatedInvitation extends Invitation {
    token: string;
}

/** What the invitee sees before joining. */
export interface InvitationPreview {
    householdName: string;
    ownerName: string;
}

export function newInvitationToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
