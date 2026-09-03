import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { Id } from '../../../shared/kernel/index.js';
import { household, householdMember } from '../model/household.schema.js';
import type { Household, HouseholdMembership } from '../model/household.js';

@Injectable()
export class HouseholdRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async findById(id: Id): Promise<Household | null> {
        const [row] = await this.db
            .select()
            .from(household)
            .where(eq(household.id, id))
            .limit(1);
        return row ?? null;
    }

    async findMembershipByUserId(
        userId: Id,
    ): Promise<HouseholdMembership | null> {
        const [row] = await this.db
            .select({ household, role: householdMember.role })
            .from(householdMember)
            .innerJoin(household, eq(household.id, householdMember.householdId))
            .where(eq(householdMember.userId, userId))
            .limit(1);
        return row ?? null;
    }

    async findMembership(
        householdId: Id,
        userId: Id,
    ): Promise<HouseholdMembership | null> {
        const [row] = await this.db
            .select({ household, role: householdMember.role })
            .from(householdMember)
            .innerJoin(household, eq(household.id, householdMember.householdId))
            .where(
                and(
                    eq(householdMember.householdId, householdId),
                    eq(householdMember.userId, userId),
                ),
            )
            .limit(1);
        return row ?? null;
    }
}
