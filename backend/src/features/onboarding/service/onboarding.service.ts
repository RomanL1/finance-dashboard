import { Injectable } from '@nestjs/common';
import { ConflictError, newId, type Id } from '../../../shared/kernel/index.js';
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
