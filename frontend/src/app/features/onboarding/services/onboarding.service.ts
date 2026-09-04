import { Injectable } from '@angular/core';
import {
    categoryDefaultsGetDefaultCategories,
    onboardingOnboard,
    onboardingValidateAccounts,
    onboardingValidateCategories,
    onboardingValidateHousehold,
} from '../../../core/api';
import type {
    CompleteOnboardingDto,
    DefaultCategoryDto,
    HouseholdDto,
    OnboardingAccountDto,
} from '../../../core/api';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
    async getDefaultCategories(): Promise<DefaultCategoryDto[]> {
        const response = await categoryDefaultsGetDefaultCategories({
            throwOnError: true,
        });
        return response.data;
    }

    async validateHousehold(name: string): Promise<void> {
        await onboardingValidateHousehold({
            body: { name },
            throwOnError: true,
        });
    }

    async validateCategories(categoryNames: string[]): Promise<void> {
        await onboardingValidateCategories({
            body: { categoryNames },
            throwOnError: true,
        });
    }

    async validateAccounts(accounts: OnboardingAccountDto[]): Promise<void> {
        await onboardingValidateAccounts({
            body: { accounts },
            throwOnError: true,
        });
    }

    async submit(dto: CompleteOnboardingDto): Promise<HouseholdDto> {
        const response = await onboardingOnboard({
            body: dto,
            throwOnError: true,
        });
        return response.data;
    }
}
