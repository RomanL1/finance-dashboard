import { Injectable } from '@angular/core';
import { householdMine } from '../../../core/api';
import type { HouseholdMineResponse } from '../household.types';

@Injectable({ providedIn: 'root' })
export class HouseholdService {
    /** Same household on every tab; fetched once per session. Rejections are not cached. */
    private cached: Promise<HouseholdMineResponse> | null = null;

    getHousehold(): Promise<HouseholdMineResponse> {
        this.cached ??= householdMine({ throwOnError: true }).then(
            (response) => response.data,
            (error: unknown) => {
                this.cached = null;
                throw error;
            },
        );
        return this.cached;
    }

    /** Resolves `null` instead of throwing when the user has no household yet. */
    async getHouseholdOrNull(): Promise<HouseholdMineResponse | null> {
        const response = await householdMine();
        return response.data ?? null;
    }
}
