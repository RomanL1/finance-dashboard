import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import type { SessionUser } from '../../../shared/infra/auth/auth.js';
import { CurrentUser } from '../../../shared/infra/auth/index.js';
import type { Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../guard/household-member.guard.js';
import {
    HouseholdDto,
    HouseholdMemberDto,
    UpdateHouseholdDto,
} from '../model/household.dto.js';
import { HouseholdService } from '../service/household.service.js';
import { toHouseholdDto, toHouseholdMemberDto } from './household.mapper.js';

@ApiTags('household')
@ApiCookieAuth()
@Controller('households')
export class HouseholdController {
    constructor(private readonly households: HouseholdService) {}

    /** Every household the user is a member of, oldest membership first; empty before onboarding. */
    @Get()
    @ApiOkResponse({ type: [HouseholdDto] })
    async list(@CurrentUser() user: SessionUser): Promise<HouseholdDto[]> {
        const memberships = await this.households.listForUser(user.id);
        return memberships.map(toHouseholdDto);
    }

    @Patch(':householdId')
    @ApiParam({
        name: 'householdId',
        description: 'Household id',
        type: String,
    })
    @ApiOkResponse({ type: HouseholdDto })
    @UseGuards(HouseholdMemberGuard)
    async updateHousehold(
        @Param('householdId') householdId: Id,
        @CurrentUser() user: SessionUser,
        @Body() dto: UpdateHouseholdDto,
    ): Promise<HouseholdDto> {
        return toHouseholdDto(
            await this.households.update(householdId, user.id, dto),
        );
    }

    @Get(':householdId/members')
    @ApiParam({
        name: 'householdId',
        description: 'Household id',
        type: String,
    })
    @ApiOkResponse({ type: [HouseholdMemberDto] })
    @UseGuards(HouseholdMemberGuard)
    async members(
        @Param('householdId') householdId: Id,
    ): Promise<HouseholdMemberDto[]> {
        const members = await this.households.listMembers(householdId);
        return members.map(toHouseholdMemberDto);
    }

    /** Owners only; the owner cannot remove themselves. */
    @Delete(':householdId/members/:userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({
        name: 'householdId',
        description: 'Household id',
        type: String,
    })
    @ApiParam({ name: 'userId', description: 'User id', type: String })
    @ApiNoContentResponse({ description: 'Member removed' })
    @UseGuards(HouseholdMemberGuard)
    async removeMember(
        @Param('householdId') householdId: Id,
        @Param('userId') userId: Id,
        @CurrentUser() user: SessionUser,
    ): Promise<void> {
        await this.households.removeMember(householdId, user.id, userId);
    }
}
