import { Injectable } from '@nestjs/common';
import {
    ForbiddenError,
    NotFoundError,
    type Id,
} from '../../../shared/kernel/index.js';
import type { Household, HouseholdMembership } from '../model/household.js';
import { HouseholdRepository } from '../repository/household.repository.js';

@Injectable()
export class HouseholdService {
    constructor(private readonly households: HouseholdRepository) {}

    async getById(householdId: Id): Promise<Household> {
        const found = await this.households.findById(householdId);
        if (!found) {
            throw new NotFoundError('Household', householdId);
        }
        return found;
    }

    async getForUser(userId: Id): Promise<HouseholdMembership> {
        const membership = await this.households.findMembershipByUserId(userId);
        if (!membership) {
            throw new NotFoundError('Household');
        }
        return membership;
    }

    /** A user belongs to exactly one household in this iteration. */
    async hasHousehold(userId: Id): Promise<boolean> {
        return (await this.households.findMembershipByUserId(userId)) !== null;
    }

    async assertMember(
        householdId: Id,
        userId: Id,
    ): Promise<HouseholdMembership> {
        const membership = await this.households.findMembership(
            householdId,
            userId,
        );
        if (!membership) {
            throw new ForbiddenError('User is not a member of this household');
        }
        return membership;
    }
}
