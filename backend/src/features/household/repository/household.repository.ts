import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { Id } from '../../../shared/kernel/index.js';
import { financeAccount } from '../../account/model/account.schema.js';
import { household, householdMember } from '../model/household.schema.js';
import type {
    Household,
    HouseholdMembership,
    UpdateHouseholdInput,
} from '../model/household.js';

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

    /**
     * A currency change relabels every account of the household in the same batch (one
     * transaction on libsql), so the "one currency per household" invariant never breaks.
     */
    async update(
        id: Id,
        changes: UpdateHouseholdInput,
    ): Promise<Household | null> {
        const updateHousehold = this.db
            .update(household)
            .set(changes)
            .where(eq(household.id, id))
            .returning();
        if (changes.baseCurrency === undefined) {
            const [row] = await updateHousehold;
            return row ?? null;
        }
        // Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
        const [rows] = await this.db.batch([
            updateHousehold,
            this.db
                .update(financeAccount)
                .set({ currency: changes.baseCurrency })
                .where(eq(financeAccount.householdId, id)),
        ]);
        return rows[0] ?? null;
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
