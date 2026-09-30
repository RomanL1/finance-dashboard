import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import type { SessionUser } from '../../../shared/infra/auth/auth.js';
import { CurrentUser, Public } from '../../../shared/infra/auth/index.js';
import type { Id } from '../../../shared/kernel/index.js';
import { toHouseholdDto } from '../../household/api/household.mapper.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';
import { HouseholdDto } from '../../household/model/household.dto.js';
import {
    CreatedInvitationDto,
    CreateInvitationDto,
    InvitationDto,
    InvitationPreviewDto,
} from '../model/invitation.dto.js';
import { InvitationService } from '../service/invitation.service.js';
import {
    toCreatedInvitationDto,
    toInvitationDto,
    toInvitationPreviewDto,
} from './invitation.mapper.js';

/** Owner side: create, list and revoke the household's open invitations. */
@ApiTags('invitation')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/invitations')
export class HouseholdInvitationController {
    constructor(private readonly invitations: InvitationService) {}

    @Get()
    @ApiOkResponse({ type: [InvitationDto] })
    async list(
        @Param('householdId') householdId: Id,
        @CurrentUser() user: SessionUser,
    ): Promise<InvitationDto[]> {
        const open = await this.invitations.listOpen(householdId, user.id);
        return open.map(toInvitationDto);
    }

    @Post()
    @ApiOkResponse({ type: CreatedInvitationDto })
    @ApiConflictResponse({ description: 'Too many open invitations' })
    async create(
        @Param('householdId') householdId: Id,
        @CurrentUser() user: SessionUser,
        @Body() dto: CreateInvitationDto,
    ): Promise<CreatedInvitationDto> {
        return toCreatedInvitationDto(
            await this.invitations.create(householdId, user.id, dto.note),
        );
    }

    @Delete(':invitationId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({
        name: 'invitationId',
        description: 'Invitation id',
        type: String,
    })
    @ApiNoContentResponse({ description: 'Invitation revoked' })
    async revoke(
        @Param('householdId') householdId: Id,
        @Param('invitationId') invitationId: Id,
        @CurrentUser() user: SessionUser,
    ): Promise<void> {
        await this.invitations.revoke(householdId, user.id, invitationId);
    }
}

/** Invitee side: the link's token is the only credential for looking at an invitation. */
@ApiTags('invitation')
@ApiParam({ name: 'token', description: 'Token from the link', type: String })
@Controller('invitations/:token')
export class InvitationController {
    constructor(private readonly invitations: InvitationService) {}

    @Get()
    @Public()
    @ApiOkResponse({ type: InvitationPreviewDto })
    @ApiNotFoundResponse({
        description: 'Unknown, expired, revoked or already used',
    })
    async preview(
        @Param('token') token: string,
    ): Promise<InvitationPreviewDto> {
        return toInvitationPreviewDto(await this.invitations.preview(token));
    }

    /** Joins as member and uses the link up. An existing member gets the household back, the link stays usable. */
    @Post('accept')
    @HttpCode(HttpStatus.OK)
    @ApiCookieAuth()
    @ApiOkResponse({ type: HouseholdDto })
    @ApiNotFoundResponse({
        description: 'Unknown, expired, revoked or already used',
    })
    async accept(
        @Param('token') token: string,
        @CurrentUser() user: SessionUser,
    ): Promise<HouseholdDto> {
        return toHouseholdDto(await this.invitations.accept(token, user.id));
    }
}
