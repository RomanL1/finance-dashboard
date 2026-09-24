import { Injectable } from '@angular/core';
import { householdMine, householdUpdateHousehold } from '../../../core/api';
import type {
    HouseholdMineResponse,
    UpdateHouseholdDto,
} from '../household.types';

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

    /**
     * Resolves `null` instead of throwing when the user has no household yet.
     * Always fetches; a completed household seeds the session cache so the first page
     * after the onboarding guard does not fetch it again.
     */
    async getHouseholdOrNull(): Promise<HouseholdMineResponse | null> {
        const response = await householdMine();
        const household = response.data ?? null;
        if (household?.onboardingComplete) {
            this.cached = Promise.resolve(household);
        }
        return household;
    }

    /** Owners only. The session cache takes the response so every tab sees the change. */
    async update(
        householdId: string,
        changes: UpdateHouseholdDto,
    ): Promise<HouseholdMineResponse> {
        const response = await householdUpdateHousehold({
            path: { householdId },
            body: changes,
            throwOnError: true,
        });
        this.cached = Promise.resolve(response.data);
        return response.data;
    }
}
