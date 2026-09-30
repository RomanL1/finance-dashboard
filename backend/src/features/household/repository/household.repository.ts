import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { user } from '../../../shared/infra/auth/auth.schema.js';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { Id } from '../../../shared/kernel/index.js';
import { financeAccount } from '../../account/model/account.schema.js';
import { household, householdMember } from '../model/household.schema.js';
import type {
    Household,
    HouseholdMember,
    HouseholdMembership,
    UpdateHouseholdInput,
} from '../model/household.js';

/** `createdAt` has second resolution; the rowid keeps memberships of the same second in the order they were made. */
const joinOrder = asc(sql`${householdMember}.rowid`);

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

    /** Oldest membership first: the frontend falls back to the first one. */
    async findMembershipsByUserId(userId: Id): Promise<HouseholdMembership[]> {
        return this.db
            .select({ household, role: householdMember.role })
            .from(householdMember)
            .innerJoin(household, eq(household.id, householdMember.householdId))
            .where(eq(householdMember.userId, userId))
            .orderBy(asc(householdMember.createdAt), joinOrder);
    }

    /** Owner first, then by join date. */
    async findMembers(householdId: Id): Promise<HouseholdMember[]> {
        const rows = await this.db
            .select({
                userId: user.id,
                name: user.name,
                email: user.email,
                role: householdMember.role,
                joinedAt: householdMember.createdAt,
            })
            .from(householdMember)
            .innerJoin(user, eq(user.id, householdMember.userId))
            .where(eq(householdMember.householdId, householdId))
            .orderBy(asc(householdMember.createdAt), joinOrder);
        return [
            ...rows.filter((row) => row.role === 'owner'),
            ...rows.filter((row) => row.role !== 'owner'),
        ];
    }

    /** Joining twice is a no-op, so a repeated accept cannot fail on the primary key. */
    async addMember(householdId: Id, userId: Id): Promise<void> {
        await this.db
            .insert(householdMember)
            .values({ householdId, userId, role: 'member' })
            .onConflictDoNothing();
    }

    /** Never removes the owner. Resolves false when nothing was removed. */
    async removeMember(householdId: Id, userId: Id): Promise<boolean> {
        const removed = await this.db
            .delete(householdMember)
            .where(
                and(
                    eq(householdMember.householdId, householdId),
                    eq(householdMember.userId, userId),
                    eq(householdMember.role, 'member'),
                ),
            )
            .returning({ userId: householdMember.userId });
        return removed.length > 0;
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
