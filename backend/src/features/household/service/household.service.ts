import { Injectable } from '@nestjs/common';
import {
    ForbiddenError,
    isValidTimeZone,
    NotFoundError,
    ValidationError,
    type Id,
} from '../../../shared/kernel/index.js';
import type {
    Household,
    HouseholdMember,
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

    /** Every household of the user, oldest membership first. Empty before onboarding. */
    async listForUser(userId: Id): Promise<HouseholdMembership[]> {
        return this.households.findMembershipsByUserId(userId);
    }

    async listMembers(householdId: Id): Promise<HouseholdMember[]> {
        return this.households.findMembers(householdId);
    }

    /** Owners only. The removed user's transactions stay: data belongs to the household. */
    async removeMember(
        householdId: Id,
        actingUserId: Id,
        memberUserId: Id,
    ): Promise<void> {
        await this.assertOwner(householdId, actingUserId);
        if (memberUserId === actingUserId) {
            throw new ValidationError('The owner cannot be removed');
        }
        if (!(await this.households.removeMember(householdId, memberUserId))) {
            throw new NotFoundError('Member', memberUserId);
        }
    }

    /** Owners only. Returns the membership so the caller keeps the role. A currency change cascades to the accounts (repository). */
    async update(
        householdId: Id,
        userId: Id,
        input: UpdateHouseholdInput,
    ): Promise<HouseholdMembership> {
        const membership = await this.assertOwner(householdId, userId);
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
        if (input.timeZone !== undefined) {
            if (!isValidTimeZone(input.timeZone)) {
                throw new ValidationError('Unknown time zone');
            }
            changes.timeZone = input.timeZone;
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

    async assertOwner(
        householdId: Id,
        userId: Id,
    ): Promise<HouseholdMembership> {
        const membership = await this.assertMember(householdId, userId);
        if (membership.role !== 'owner') {
            throw new ForbiddenError('Only the owner can change the household');
        }
        return membership;
    }
}
