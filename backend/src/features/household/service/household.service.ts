import { Injectable } from '@nestjs/common';
import {
    ConflictError,
    newId,
    NotFoundError,
    type Id,
} from '../../../shared/kernel/index.js';
import type { Household, HouseholdMembership } from '../model/household.js';
import { HouseholdRepository } from '../repository/household.repository.js';

@Injectable()
export class HouseholdService {
    constructor(private readonly households: HouseholdRepository) {}

    async getForUser(userId: Id): Promise<HouseholdMembership> {
        const membership = await this.households.findMembershipByUserId(userId);
        if (!membership) {
            throw new NotFoundError('Household');
        }
        return membership;
    }

    /** A user belongs to exactly one household in this iteration. */
    async createForOwner(
        ownerUserId: Id,
        name: string,
        currency = 'CHF',
    ): Promise<Household> {
        if (await this.households.findMembershipByUserId(ownerUserId)) {
            throw new ConflictError('User already belongs to a household');
        }
        const entity: Household = {
            id: newId(),
            name,
            currency,
            createdAt: new Date(),
        };
        await this.households.insert(entity, ownerUserId);
        return entity;
    }
}
