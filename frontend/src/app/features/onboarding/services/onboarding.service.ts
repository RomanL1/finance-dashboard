import { Injectable } from '@angular/core';
import {
    categoryCreateCategory,
    categoryGetDefaultCategories,
    householdCompleteOnboarding,
    householdCreate,
} from '../../../core/api';
import type {
    CreateHouseholdDto,
    DefaultCategoryDto,
    HouseholdDto,
} from '../../../core/api';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
    async createHousehold(
        name: string,
        currency: CreateHouseholdDto['currency'],
    ): Promise<HouseholdDto> {
        const response = await householdCreate({
            body: { name, currency },
            throwOnError: true,
        });
        return response.data;
    }

    async getDefaultCategories(
        householdId: string,
    ): Promise<DefaultCategoryDto[]> {
        const response = await categoryGetDefaultCategories({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }

    async createCategory(householdId: string, name: string): Promise<void> {
        await categoryCreateCategory({
            path: { householdId },
            body: { name },
            throwOnError: true,
        });
    }

    async completeOnboarding(householdId: string): Promise<HouseholdDto> {
        const response = await householdCompleteOnboarding({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }
}
