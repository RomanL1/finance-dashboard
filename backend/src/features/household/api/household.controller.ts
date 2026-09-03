import {
    Body,
    Controller,
    forwardRef,
    Get,
    Inject,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import type { SessionUser } from '../../../shared/infra/auth/auth.js';
import { CurrentUser } from '../../../shared/infra/auth/index.js';
import type { Id } from '../../../shared/kernel/index.js';
import { CategoryService } from '../../category/service/category.service.js';
import { AccountService } from '../../account/service/account.service.js';
import { CreateHouseholdDto, HouseholdDto } from '../model/household.dto.js';
import { HouseholdService } from '../service/household.service.js';
import { HouseholdMemberGuard } from '../guard/household-member.guard.js';
import { toHouseholdDto } from './household.mapper.js';

@ApiTags('household')
@ApiCookieAuth()
@Controller('households')
export class HouseholdController {
    constructor(
        private readonly households: HouseholdService,
        @Inject(forwardRef(() => CategoryService))
        private readonly categories: CategoryService,
        @Inject(forwardRef(() => AccountService))
        private readonly accounts: AccountService,
    ) {}

    @Get('me')
    @ApiOkResponse({ type: HouseholdDto })
    async mine(@CurrentUser() user: SessionUser): Promise<HouseholdDto> {
        return toHouseholdDto(await this.households.getForUser(user.id));
    }

    @Post()
    @ApiOkResponse({ type: HouseholdDto })
    async create(
        @CurrentUser() user: SessionUser,
        @Body() dto: CreateHouseholdDto,
    ): Promise<HouseholdDto> {
        const created = await this.households.createForOwner(
            user.id,
            dto.name,
            dto.currency,
        );
        return toHouseholdDto({ household: created, role: 'owner' });
    }

    @UseGuards(HouseholdMemberGuard)
    @Patch(':householdId/complete-onboarding')
    @ApiParam({
        name: 'householdId',
        description: 'Household id',
        type: String,
    })
    @ApiOkResponse({ type: HouseholdDto })
    async completeOnboarding(
        @Param('householdId') householdId: Id,
        @CurrentUser() user: SessionUser,
    ): Promise<HouseholdDto> {
        await this.categories.assertHasCategories(householdId);
        await this.accounts.assertHasAccounts(householdId);
        await this.households.completeOnboarding(householdId);
        return toHouseholdDto(await this.households.getForUser(user.id));
    }
}
