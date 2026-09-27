import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { Id, LocalDate } from '../../../shared/kernel/index.js';
import { financeAccount } from '../../account/model/account.schema.js';
import { category } from '../../category/model/category.schema.js';
import { household } from '../../household/model/household.schema.js';
import { transaction } from '../../transaction/model/transaction.schema.js';
import type {
    CreateRecurringTransaction,
    Cursor,
    RecurringTransaction,
} from '../model/recurring.js';
import { recurringTransaction } from '../model/recurring.schema.js';

/** A rule the scheduler may have to book, with what it needs from account and household. */
export interface DueCandidate {
    rule: RecurringTransaction;
    timeZone: string;
    /** Account inactive from this instant on: occurrences there are skipped, not booked. */
    archivedAt: Date | null;
}

/** One transaction to create for an occurrence. */
export interface Booking {
    id: Id;
    date: Date;
}

@Injectable()
export class RecurringRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    private readonly columns = {
        id: recurringTransaction.id,
        accountId: recurringTransaction.accountId,
        categoryId: recurringTransaction.categoryId,
        type: recurringTransaction.type,
        amount: recurringTransaction.amount,
        title: recurringTransaction.title,
        description: recurringTransaction.description,
        interval: recurringTransaction.interval,
        weekday: recurringTransaction.weekday,
        dayOfMonth: recurringTransaction.dayOfMonth,
        startDate: recurringTransaction.startDate,
        varyingAmount: recurringTransaction.varyingAmount,
        weekendShift: recurringTransaction.weekendShift,
        paused: recurringTransaction.paused,
        nextOccurrence: recurringTransaction.nextOccurrence,
        nextDueDate: recurringTransaction.nextDueDate,
        lastOccurrence: recurringTransaction.lastOccurrence,
        createdAt: recurringTransaction.createdAt,
    };

    /** Rules whose account belongs to the household; scopes every query and mutation. */
    private inHousehold(householdId: Id) {
        return inArray(
            recurringTransaction.accountId,
            this.db
                .select({ id: financeAccount.id })
                .from(financeAccount)
                .where(eq(financeAccount.householdId, householdId)),
        );
    }

    /** Oldest first; the service orders by next booking day. */
    async listByHouseholdId(householdId: Id): Promise<RecurringTransaction[]> {
        return this.db
            .select(this.columns)
            .from(recurringTransaction)
            .where(this.inHousehold(householdId))
            .orderBy(asc(recurringTransaction.createdAt));
    }

    async findById(
        householdId: Id,
        id: Id,
    ): Promise<RecurringTransaction | null> {
        const [row] = await this.db
            .select(this.columns)
            .from(recurringTransaction)
            .where(
                and(
                    eq(recurringTransaction.id, id),
                    this.inHousehold(householdId),
                ),
            )
            .limit(1);
        return row ?? null;
    }

    async accountExists(householdId: Id, accountId: Id): Promise<boolean> {
        const [row] = await this.db
            .select({ id: financeAccount.id })
            .from(financeAccount)
            .where(
                and(
                    eq(financeAccount.id, accountId),
                    eq(financeAccount.householdId, householdId),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    async categoryExists(householdId: Id, categoryId: Id): Promise<boolean> {
        const [row] = await this.db
            .select({ id: category.id })
            .from(category)
            .where(
                and(
                    eq(category.id, categoryId),
                    eq(category.householdId, householdId),
                ),
            )
            .limit(1);
        return row !== undefined;
    }

    async create(
        entity: CreateRecurringTransaction,
    ): Promise<RecurringTransaction> {
        const [row] = await this.db
            .insert(recurringTransaction)
            .values(entity)
            .returning(this.columns);
        return row!;
    }

    /** Full replace of the rule; null when it does not exist or belongs to another household. */
    async update(
        householdId: Id,
        entity: CreateRecurringTransaction,
    ): Promise<RecurringTransaction | null> {
        const [row] = await this.db
            .update(recurringTransaction)
            .set(entity)
            .where(
                and(
                    eq(recurringTransaction.id, entity.id),
                    this.inHousehold(householdId),
                ),
            )
            .returning(this.columns);
        return row ?? null;
    }

    /**
     * Full replace that also removes the rule's upcoming transactions (dated after `now`), so
     * the caller can book them again from the new values. One batch: both or neither.
     * Null when the rule does not exist or belongs to another household.
     */
    async replaceWithUpcoming(
        householdId: Id,
        entity: CreateRecurringTransaction,
        now: Date,
    ): Promise<RecurringTransaction | null> {
        // Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
        const [, rows] = await this.db.batch([
            this.deleteUpcoming(householdId, entity.id, now),
            this.db
                .update(recurringTransaction)
                .set(entity)
                .where(
                    and(
                        eq(recurringTransaction.id, entity.id),
                        this.inHousehold(householdId),
                    ),
                )
                .returning(this.columns),
        ]);
        return rows[0] ?? null;
    }

    /** Removes the rule and its upcoming transactions; the ones whose day has come stay and lose the link (FK set null). */
    async delete(householdId: Id, id: Id, now: Date): Promise<boolean> {
        // Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
        const [, deleted] = await this.db.batch([
            this.deleteUpcoming(householdId, id, now),
            this.db
                .delete(recurringTransaction)
                .where(
                    and(
                        eq(recurringTransaction.id, id),
                        this.inHousehold(householdId),
                    ),
                )
                .returning({ id: recurringTransaction.id }),
        ]);
        return deleted.length > 0;
    }

    private deleteUpcoming(householdId: Id, id: Id, now: Date) {
        return this.db
            .delete(transaction)
            .where(
                and(
                    eq(transaction.recurringTransactionId, id),
                    gt(transaction.date, now),
                    inArray(
                        transaction.accountId,
                        this.db
                            .select({ id: financeAccount.id })
                            .from(financeAccount)
                            .where(eq(financeAccount.householdId, householdId)),
                    ),
                ),
            );
    }

    /**
     * Active rules due on or before `latest`, optionally just one. The caller passes the
     * latest "today" any time zone can have and filters by each household's own today.
     */
    async findDueCandidates(
        latest: LocalDate,
        ruleId?: Id,
    ): Promise<DueCandidate[]> {
        return this.db
            .select({
                rule: this.columns,
                timeZone: household.timeZone,
                archivedAt: financeAccount.archivedAt,
            })
            .from(recurringTransaction)
            .innerJoin(
                financeAccount,
                eq(financeAccount.id, recurringTransaction.accountId),
            )
            .innerJoin(household, eq(household.id, financeAccount.householdId))
            .where(
                and(
                    eq(recurringTransaction.paused, false),
                    lte(recurringTransaction.nextDueDate, latest),
                    ruleId ? eq(recurringTransaction.id, ruleId) : undefined,
                ),
            );
    }

    /**
     * Books the occurrences and moves the cursor in one batch (one transaction on libsql).
     * Compare-and-set on `nextOccurrence`: every insert copies from the rule only while the
     * cursor is still where the caller read it, so a concurrent run books nothing twice.
     * Returns false when another run got there first.
     */
    async book(
        rule: RecurringTransaction,
        bookings: Booking[],
        cursor: Cursor,
    ): Promise<boolean> {
        const unchanged = and(
            eq(recurringTransaction.id, rule.id),
            eq(recurringTransaction.paused, false),
            eq(recurringTransaction.nextOccurrence, rule.nextOccurrence),
        );
        const inserts = bookings.map((booking) =>
            this.db.insert(transaction).select(
                this.db
                    .select({
                        id: sql<string>`${booking.id}`.as('id'),
                        accountId: recurringTransaction.accountId,
                        categoryId: recurringTransaction.categoryId,
                        type: recurringTransaction.type,
                        amount: recurringTransaction.amount,
                        title: recurringTransaction.title,
                        description: recurringTransaction.description,
                        date: sql<Date>`${Math.floor(booking.date.getTime() / 1000)}`.as(
                            'date',
                        ),
                        recurringTransactionId: recurringTransaction.id,
                        needsConfirmation: recurringTransaction.varyingAmount,
                    })
                    .from(recurringTransaction)
                    .where(unchanged),
            ),
        );
        const moveCursor = this.db
            .update(recurringTransaction)
            .set(cursor)
            .where(unchanged)
            .returning({ id: recurringTransaction.id });
        // Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
        // The cursor moves last, so the inserts above still see the old one.
        const statements: BatchItem<'sqlite'>[] = [...inserts, moveCursor];
        const results = await this.db.batch(
            statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]],
        );
        const moved = results.at(-1) as { id: string }[];
        return moved.length > 0;
    }
}
