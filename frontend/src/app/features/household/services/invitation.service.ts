import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import {
    householdInvitationCreate,
    householdInvitationList,
    householdInvitationRevoke,
    invitationAccept,
    invitationPreview,
} from '../../../core/api';
import { APP_PATHS } from '../../../config/paths.config';
import type {
    CreatedInvitationDto,
    HouseholdDto,
    InvitationDto,
    InvitationPreviewDto,
} from '../household.types';

@Injectable({ providedIn: 'root' })
export class InvitationService {
    constructor(@Inject(DOCUMENT) private readonly document: Document) {}

    /** Owners only: the household's open invitations, without their links. */
    async list(householdId: string): Promise<InvitationDto[]> {
        const response = await householdInvitationList({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }

    /** Owners only. The token in the response is the only copy; build the link with `linkFor`. */
    async create(
        householdId: string,
        note?: string,
    ): Promise<CreatedInvitationDto> {
        const response = await householdInvitationCreate({
            path: { householdId },
            body: { note: note || undefined },
            throwOnError: true,
        });
        return response.data;
    }

    /** Owners only. */
    async revoke(householdId: string, invitationId: string): Promise<void> {
        await householdInvitationRevoke({
            path: { householdId, invitationId },
            throwOnError: true,
        });
    }

    /** `null` for a link that is unknown, expired, revoked or used: the server does not tell which. */
    async preview(token: string): Promise<InvitationPreviewDto | null> {
        const response = await invitationPreview({ path: { token } });
        return response.data ?? null;
    }

    /** Joins the household; `null` when the link is no longer valid. */
    async accept(token: string): Promise<HouseholdDto | null> {
        const response = await invitationAccept({ path: { token } });
        return response.data ?? null;
    }

    linkFor(token: string): string {
        return `${this.document.location.origin}/${APP_PATHS.INVITE}/${token}`;
    }
}
