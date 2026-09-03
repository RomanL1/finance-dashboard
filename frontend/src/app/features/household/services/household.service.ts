import { Injectable } from '@angular/core';
import { householdMine } from '../../../core/api';
import type { HouseholdMineResponse } from '../household.types';

@Injectable({ providedIn: 'root' })
export class HouseholdService {
    async getHousehold(): Promise<HouseholdMineResponse> {
        const response = await householdMine({ throwOnError: true });
        return response.data;
    }
}
