import { Injectable } from '@nestjs/common';
import {
    ForbiddenError,
    NotFoundError,
    ValidationError,
    type Id,
} from '../../../shared/kernel/index.js';
import type {
    Household,
    HouseholdMembership,
    UpdateHouseholdInput,
} from '../model/household.js';
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

    /** Owners only. Returns the membership so the caller keeps the role. */
    async update(
        householdId: Id,
        userId: Id,
        input: UpdateHouseholdInput,
    ): Promise<HouseholdMembership> {
        const membership = await this.assertMember(householdId, userId);
        if (membership.role !== 'owner') {
            throw new ForbiddenError('Only the owner can change the household');
        }
        const changes: UpdateHouseholdInput = {};
        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name)
                throw new ValidationError('Household name cannot be empty');
            changes.name = name;
        }
        if (input.baseCurrency !== undefined) {
            changes.baseCurrency = input.baseCurrency;
        }
        const household =
            Object.keys(changes).length === 0
                ? membership.household
                : await this.households.update(householdId, changes);
        if (!household) throw new NotFoundError('Household', householdId);
        return { household, role: membership.role };
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
