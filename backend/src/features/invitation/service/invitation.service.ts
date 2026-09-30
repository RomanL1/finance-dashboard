import { Inject, Injectable } from '@nestjs/common';
import {
    CLOCK,
    ConflictError,
    newId,
    NotFoundError,
    type Clock,
    type Id,
} from '../../../shared/kernel/index.js';
import type { HouseholdMembership } from '../../household/model/household.js';
import { HouseholdRepository } from '../../household/repository/household.repository.js';
import { HouseholdService } from '../../household/service/household.service.js';
import {
    hashInvitationToken,
    INVITATION_TTL_MS,
    MAX_OPEN_INVITATIONS,
    newInvitationToken,
    type CreatedInvitation,
    type Invitation,
    type InvitationPreview,
} from '../model/invitation.js';
import { InvitationRepository } from '../repository/invitation.repository.js';

@Injectable()
export class InvitationService {
    constructor(
        private readonly invitations: InvitationRepository,
        private readonly households: HouseholdService,
        private readonly members: HouseholdRepository,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    /** Owners only. The returned token is the only copy: the link cannot be shown again. */
    async create(
        householdId: Id,
        userId: Id,
        note?: string,
    ): Promise<CreatedInvitation> {
        const open = await this.listOpen(householdId, userId);
        if (open.length >= MAX_OPEN_INVITATIONS) {
            throw new ConflictError(
                `A household can have at most ${MAX_OPEN_INVITATIONS} open invitations`,
            );
        }
        const now = this.clock.now();
        const token = newInvitationToken();
        const invitation: Invitation = {
            id: newId(),
            householdId,
            note: note?.trim() || null,
            expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
            createdAt: now,
        };
        await this.invitations.insert(invitation, hashInvitationToken(token));
        return { ...invitation, token };
    }

    /** Owners only. Expired invitations are purged on the way. */
    async listOpen(householdId: Id, userId: Id): Promise<Invitation[]> {
        await this.households.assertOwner(householdId, userId);
        const now = this.clock.now();
        await this.invitations.deleteExpired(householdId, now);
        return this.invitations.findOpen(householdId, now);
    }

    /** Owners only. */
    async revoke(householdId: Id, userId: Id, invitationId: Id): Promise<void> {
        await this.households.assertOwner(householdId, userId);
        if (!(await this.invitations.delete(householdId, invitationId))) {
            throw new NotFoundError('Invitation', invitationId);
        }
    }

    /** Expired, revoked, used and unknown links all answer the same, so a link tells nothing about its past. */
    async preview(token: string): Promise<InvitationPreview> {
        const found = await this.invitations.findValidByTokenHash(
            hashInvitationToken(token),
            this.clock.now(),
        );
        if (!found) throw new NotFoundError('Invitation');
        return {
            householdName: found.householdName,
            ownerName: found.ownerName,
        };
    }

    /** Someone who is already a member keeps the link unused and just gets the household. */
    async accept(token: string, userId: Id): Promise<HouseholdMembership> {
        const tokenHash = hashInvitationToken(token);
        const now = this.clock.now();
        const found = await this.invitations.findValidByTokenHash(
            tokenHash,
            now,
        );
        if (!found) throw new NotFoundError('Invitation');

        const existing = await this.members.findMembership(
            found.householdId,
            userId,
        );
        if (existing) return existing;

        const householdId = await this.invitations.consume(tokenHash, now);
        if (!householdId) throw new NotFoundError('Invitation');
        await this.members.addMember(householdId, userId);
        return this.households.assertMember(householdId, userId);
    }
}
