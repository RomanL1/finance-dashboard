import { Injectable } from '@nestjs/common';
import {
    ConflictError,
    newId,
    SUPPORTED_CURRENCIES,
    ValidationError,
    type Id,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';
import type { Household } from '../../household/model/household.js';
import { HouseholdService } from '../../household/service/household.service.js';
import {
    assertUniqueCategoryNames,
    buildCategory,
} from '../../category/model/category.js';
import {
    buildAccount,
    type CreateAccountInput,
} from '../../account/model/account.js';
import { OnboardingRepository } from '../repository/onboarding.repository.js';

export interface OnboardingInput {
    name: string;
    categoryNames: string[];
    accounts: CreateAccountInput[];
}

@Injectable()
export class OnboardingService {
    constructor(
        private readonly onboarding: OnboardingRepository,
        private readonly households: HouseholdService,
    ) {}

    validateCategoryNames(categoryNames: string[]): void {
        assertUniqueCategoryNames(categoryNames);
    }

    /**
     * Onboarding is submitted once, in full: the household, its categories and its
     * accounts are written together, so no partial household ever exists server-side.
     */
    async onboard(ownerUserId: Id, input: OnboardingInput): Promise<Household> {
        if (await this.households.hasHousehold(ownerUserId)) {
            throw new ConflictError('User already belongs to a household');
        }
        assertUniqueCategoryNames(input.categoryNames);

        const household: Household = {
            id: newId(),
            name: input.name,
            onboardingComplete: true,
            // The first account's currency becomes the household currency; every account must share it.
            baseCurrency: baseCurrencyOf(input.accounts),
            createdAt: new Date(),
        };

        await this.onboarding.insertHousehold({
            household,
            ownerUserId,
            categories: input.categoryNames.map(buildCategory),
            accounts: input.accounts.map(buildAccount),
        });

        return household;
    }
}

function baseCurrencyOf(accounts: CreateAccountInput[]): SupportedCurrency {
    const first = accounts[0]?.currency;
    if (!isSupportedCurrency(first)) {
        throw new ValidationError('Onboarding needs at least one account');
    }
    if (accounts.some((a) => a.currency !== first)) {
        throw new ValidationError('All accounts must use the same currency');
    }
    return first;
}

function isSupportedCurrency(value: unknown): value is SupportedCurrency {
    return (SUPPORTED_CURRENCIES as readonly unknown[]).includes(value);
}
