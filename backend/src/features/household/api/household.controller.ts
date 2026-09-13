import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import type { SessionUser } from '../../../shared/infra/auth/auth.js';
import { CurrentUser } from '../../../shared/infra/auth/index.js';
import type { Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../guard/household-member.guard.js';
import { HouseholdDto, UpdateHouseholdDto } from '../model/household.dto.js';
import { HouseholdService } from '../service/household.service.js';
import { toHouseholdDto } from './household.mapper.js';

@ApiTags('household')
@ApiCookieAuth()
@Controller('households')
export class HouseholdController {
    constructor(private readonly households: HouseholdService) {}

    @Get('me')
    @ApiOkResponse({ type: HouseholdDto })
    async mine(@CurrentUser() user: SessionUser): Promise<HouseholdDto> {
        return toHouseholdDto(await this.households.getForUser(user.id));
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
}
