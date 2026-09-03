import { Injectable } from '@angular/core';
import { householdMine } from '../../../core/api';
import type { HouseholdMineResponse } from '../household.types';

@Injectable({ providedIn: 'root' })
export class HouseholdService {
    async getHousehold(): Promise<HouseholdMineResponse> {
        const response = await householdMine({ throwOnError: true });
        return response.data;
    }

    /** Resolves `null` instead of throwing when the user has no household yet. */
    async getHouseholdOrNull(): Promise<HouseholdMineResponse | null> {
        const response = await householdMine();
        return response.data ?? null;
    }
}
