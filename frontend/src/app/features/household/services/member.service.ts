import { Injectable } from '@angular/core';
import { householdMembers, householdRemoveMember } from '../../../core/api';
import type { HouseholdMemberDto } from '../household.types';

@Injectable({ providedIn: 'root' })
export class MemberService {
    /** Owner first, then members by join date. */
    async list(householdId: string): Promise<HouseholdMemberDto[]> {
        const response = await householdMembers({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }

    /** Owners only. What the member entered stays in the household. */
    async remove(householdId: string, userId: string): Promise<void> {
        await householdRemoveMember({
            path: { householdId, userId },
            throwOnError: true,
        });
    }
}
