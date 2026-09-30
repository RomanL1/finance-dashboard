import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, lte } from 'drizzle-orm';
import { user } from '../../../shared/infra/auth/auth.schema.js';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { Id } from '../../../shared/kernel/index.js';
import {
    household,
    householdMember,
} from '../../household/model/household.schema.js';
import type { Invitation, InvitationPreview } from '../model/invitation.js';
import { householdInvitation } from '../model/invitation.schema.js';

const columns = {
    id: householdInvitation.id,
    householdId: householdInvitation.householdId,
    note: householdInvitation.note,
    expiresAt: householdInvitation.expiresAt,
    createdAt: householdInvitation.createdAt,
};

@Injectable()
export class InvitationRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async insert(invitation: Invitation, tokenHash: string): Promise<void> {
        await this.db
            .insert(householdInvitation)
            .values({ ...invitation, tokenHash });
    }

    async findOpen(householdId: Id, now: Date): Promise<Invitation[]> {
        return this.db
            .select(columns)
            .from(householdInvitation)
            .where(
                and(
                    eq(householdInvitation.householdId, householdId),
                    gt(householdInvitation.expiresAt, now),
                ),
            )
            .orderBy(asc(householdInvitation.createdAt));
    }

    /** No scheduler: expired rows go whenever the owner lists or creates. */
    async deleteExpired(householdId: Id, now: Date): Promise<void> {
        await this.db
            .delete(householdInvitation)
            .where(
                and(
                    eq(householdInvitation.householdId, householdId),
                    lte(householdInvitation.expiresAt, now),
                ),
            );
    }

    async delete(householdId: Id, invitationId: Id): Promise<boolean> {
        const deleted = await this.db
            .delete(householdInvitation)
            .where(
                and(
                    eq(householdInvitation.householdId, householdId),
                    eq(householdInvitation.id, invitationId),
                ),
            )
            .returning({ id: householdInvitation.id });
        return deleted.length > 0;
    }

    async findValidByTokenHash(
        tokenHash: string,
        now: Date,
    ): Promise<(InvitationPreview & { householdId: Id }) | null> {
        const [row] = await this.db
            .select({
                householdId: household.id,
                householdName: household.name,
                ownerName: user.name,
            })
            .from(householdInvitation)
            .innerJoin(
                household,
                eq(household.id, householdInvitation.householdId),
            )
            .innerJoin(
                householdMember,
                and(
                    eq(householdMember.householdId, household.id),
                    eq(householdMember.role, 'owner'),
                ),
            )
            .innerJoin(user, eq(user.id, householdMember.userId))
            .where(
                and(
                    eq(householdInvitation.tokenHash, tokenHash),
                    gt(householdInvitation.expiresAt, now),
                ),
            )
            .limit(1);
        return row ?? null;
    }

    /**
     * Uses the link up: one conditional delete, so of two people accepting at once
     * only one gets the household id back.
     */
    async consume(tokenHash: string, now: Date): Promise<Id | null> {
        const [row] = await this.db
            .delete(householdInvitation)
            .where(
                and(
                    eq(householdInvitation.tokenHash, tokenHash),
                    gt(householdInvitation.expiresAt, now),
                ),
            )
            .returning({ householdId: householdInvitation.householdId });
        return row?.householdId ?? null;
    }
}
