import {
    CreatedInvitationDto,
    InvitationDto,
    InvitationPreviewDto,
} from '../model/invitation.dto.js';
import type {
    CreatedInvitation,
    Invitation,
    InvitationPreview,
} from '../model/invitation.js';

export function toInvitationDto(invitation: Invitation): InvitationDto {
    return fill(new InvitationDto(), invitation);
}

export function toCreatedInvitationDto(
    invitation: CreatedInvitation,
): CreatedInvitationDto {
    const dto = fill(new CreatedInvitationDto(), invitation);
    dto.token = invitation.token;
    return dto;
}

export function toInvitationPreviewDto(
    preview: InvitationPreview,
): InvitationPreviewDto {
    const dto = new InvitationPreviewDto();
    dto.householdName = preview.householdName;
    dto.ownerName = preview.ownerName;
    return dto;
}

function fill<T extends InvitationDto>(dto: T, invitation: Invitation): T {
    dto.id = invitation.id;
    dto.note = invitation.note;
    dto.createdAt = invitation.createdAt.toISOString();
    dto.expiresAt = invitation.expiresAt.toISOString();
    return dto;
}
