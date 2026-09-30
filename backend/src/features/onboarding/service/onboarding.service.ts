import { Injectable } from '@nestjs/common';
import {
    newId,
    SUPPORTED_CURRENCIES,
    ValidationError,
    type Id,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';
import type { Household } from '../../household/model/household.js';
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
    /** IANA zone; Europe/Zurich when omitted. */
    timeZone?: string;
    categoryNames: string[];
    accounts: CreateAccountInput[];
}

@Injectable()
export class OnboardingService {
    constructor(private readonly onboarding: OnboardingRepository) {}

    validateCategoryNames(categoryNames: string[]): void {
        assertUniqueCategoryNames(categoryNames);
    }

    /**
     * Onboarding is submitted once, in full: the household, its categories and its
     * accounts are written together, so no partial household ever exists server-side.
     * A user may onboard again: each run creates another household they own.
     */
    async onboard(ownerUserId: Id, input: OnboardingInput): Promise<Household> {
        assertUniqueCategoryNames(input.categoryNames);

        const household: Household = {
            id: newId(),
            name: input.name,
            onboardingComplete: true,
            // The first account's currency becomes the household currency; every account must share it.
            baseCurrency: baseCurrencyOf(input.accounts),
            timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
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

const DEFAULT_TIME_ZONE = 'Europe/Zurich';

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
