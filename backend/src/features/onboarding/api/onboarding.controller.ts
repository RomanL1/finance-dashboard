import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiTags,
} from '@nestjs/swagger';
import type { SessionUser } from '../../../shared/infra/auth/auth.js';
import { CurrentUser } from '../../../shared/infra/auth/index.js';
import { HouseholdDto } from '../../household/model/household.dto.js';
import { toHouseholdDto } from '../../household/api/household.mapper.js';
import {
    CompleteOnboardingDto,
    OnboardingAccountsDto,
    OnboardingCategoriesDto,
    OnboardingHouseholdDto,
} from '../model/onboarding.dto.js';
import { OnboardingService } from '../service/onboarding.service.js';

@ApiTags('onboarding')
@ApiCookieAuth()
@Controller('households/onboarding')
export class OnboardingController {
    constructor(private readonly onboarding: OnboardingService) {}

    @Post()
    @ApiOkResponse({ type: HouseholdDto })
    async onboard(
        @CurrentUser() user: SessionUser,
        @Body() dto: CompleteOnboardingDto,
    ): Promise<HouseholdDto> {
        const household = await this.onboarding.onboard(user.id, {
            name: dto.name,
            categoryNames: dto.categoryNames,
            accounts: dto.accounts.map((account) => ({
                description: account.description,
                currency: account.currency,
                initialValue: account.initialValue,
                startDate: new Date(account.startDate),
            })),
        });
        return toHouseholdDto({ household, role: 'owner' });
    }

    @Post('validate-household')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Household step values are valid' })
    validateHousehold(@Body() _dto: OnboardingHouseholdDto): void {}

    @Post('validate-categories')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Categories step values are valid' })
    validateCategories(@Body() dto: OnboardingCategoriesDto): void {
        this.onboarding.validateCategoryNames(dto.categoryNames);
    }

    @Post('validate-accounts')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Accounts step values are valid' })
    validateAccounts(@Body() _dto: OnboardingAccountsDto): void {}
}
