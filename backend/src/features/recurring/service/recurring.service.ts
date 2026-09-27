import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    addDays,
    addYears,
    CLOCK,
    newId,
    NotFoundError,
    startOfDayIn,
    todayIn,
    toLocalDate,
    ValidationError,
    type Clock,
    type Id,
    type LocalDate,
} from '../../../shared/kernel/index.js';
import { HouseholdService } from '../../household/service/household.service.js';
import {
    advance,
    bookingHorizon,
    buildRecurringFields,
    buildRecurringTransaction,
    cursorAfterEdit,
    cursorOnResume,
    lastPassedOccurrence,
    nextDate,
    type RecurringTransaction,
    type RecurringTransactionView,
    type RecurringTransactionFields,
    type RecurringTransactionInput,
} from '../model/recurring.js';
import {
    RecurringRepository,
    type Booking,
    type DueCandidate,
} from '../repository/recurring.repository.js';

@Injectable()
export class RecurringService {
    private readonly logger = new Logger(RecurringService.name);
    /** Serializes rule writes and booking runs in this process, so a run never reads a cursor an edit is about to move. */
    private queue: Promise<unknown> = Promise.resolve();

    constructor(
        private readonly recurring: RecurringRepository,
        private readonly households: HouseholdService,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    async getAll(householdId: Id): Promise<RecurringTransactionView[]> {
        const today = await this.today(householdId);
        // Active first, soonest next booking first.
        return (await this.recurring.listByHouseholdId(householdId))
            .map((rule) => withNextDate(rule, today))
            .toSorted(
                (a, b) =>
                    Number(a.paused) - Number(b.paused) ||
                    a.nextDate.localeCompare(b.nextDate),
            );
    }

    /** Past occurrences since the start date and the rest of the current month are booked right away. */
    async create(
        householdId: Id,
        input: RecurringTransactionInput,
    ): Promise<RecurringTransactionView> {
        return this.serial(async () => {
            const fields = buildRecurringFields(input);
            await this.assertReferences(householdId, fields);
            this.assertStartDate(fields, await this.today(householdId));
            const created = await this.recurring.create(
                buildRecurringTransaction(fields),
            );
            return this.bookNow(householdId, created.id);
        });
    }

    /**
     * Full replace. Transactions whose day has come stay as they are; upcoming ones are
     * removed and booked again from the new values. The schedule continues right after the
     * last passed occurrence, so nothing is booked twice.
     */
    async update(
        householdId: Id,
        id: Id,
        input: RecurringTransactionInput,
    ): Promise<RecurringTransactionView> {
        return this.serial(async () => {
            const existing = await this.get(householdId, id);
            const fields = buildRecurringFields(input);
            await this.assertReferences(householdId, fields);
            const today = await this.today(householdId);
            if (fields.startDate !== existing.startDate) {
                this.assertStartDate(fields, today);
            }
            await this.saveWithoutUpcoming(householdId, {
                ...fields,
                id,
                paused: existing.paused,
                ...cursorAfterEdit(
                    fields,
                    lastPassedOccurrence(
                        existing,
                        existing.lastOccurrence,
                        today,
                    ),
                ),
            });
            return this.bookNow(householdId, id);
        });
    }

    /** Removes the upcoming transactions; the cursor goes back to the last passed occurrence, so resuming can book them again. */
    async pause(householdId: Id, id: Id): Promise<RecurringTransactionView> {
        return this.serial(async () => {
            const existing = await this.get(householdId, id);
            const today = await this.today(householdId);
            if (existing.paused) return withNextDate(existing, today);
            const paused = await this.saveWithoutUpcoming(householdId, {
                ...existing,
                ...cursorAfterEdit(
                    existing,
                    lastPassedOccurrence(
                        existing,
                        existing.lastOccurrence,
                        today,
                    ),
                ),
                paused: true,
            });
            return withNextDate(paused, today);
        });
    }

    /** Occurrences that fell into the pause are skipped for good; today's and the rest of the month get booked. */
    async resume(householdId: Id, id: Id): Promise<RecurringTransactionView> {
        return this.serial(async () => {
            const existing = await this.get(householdId, id);
            if (!existing.paused) {
                return withNextDate(existing, await this.today(householdId));
            }
            await this.save(householdId, {
                ...existing,
                ...cursorOnResume(
                    existing,
                    existing,
                    await this.today(householdId),
                ),
                paused: false,
            });
            return this.bookNow(householdId, id);
        });
    }

    /** Upcoming transactions go with it; the ones whose day has come stay and lose the link. */
    async delete(householdId: Id, id: Id): Promise<void> {
        return this.serial(async () => {
            if (
                !(await this.recurring.delete(
                    householdId,
                    id,
                    this.clock.now(),
                ))
            ) {
                throw new NotFoundError('RecurringTransaction', id);
            }
        });
    }

    /** Books every occurrence due by the end of the current month across all households (scheduler entry point). Returns the number of transactions created. */
    async runDue(): Promise<number> {
        return this.serial(() => this.bookDue());
    }

    private async bookNow(
        householdId: Id,
        id: Id,
    ): Promise<RecurringTransactionView> {
        await this.bookDue(id);
        return withNextDate(
            await this.get(householdId, id),
            await this.today(householdId),
        );
    }

    /** One failing rule is logged and retried on the next run; the others still book. */
    private async bookDue(ruleId?: Id): Promise<number> {
        const now = this.clock.now();
        // No zone is more than a day ahead of UTC, so this bounds every household's horizon.
        const latest = bookingHorizon(addDays(toLocalDate(now), 1));
        let booked = 0;
        for (const candidate of await this.recurring.findDueCandidates(
            latest,
            ruleId,
        )) {
            try {
                booked += await this.bookCandidate(candidate, now);
            } catch (error) {
                this.logger.error(
                    `Booking recurring transaction ${candidate.rule.id} failed`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }
        return booked;
    }

    private async bookCandidate(
        { rule, timeZone, archivedAt }: DueCandidate,
        now: Date,
    ): Promise<number> {
        const step = advance(
            rule,
            rule,
            bookingHorizon(todayIn(timeZone, now)),
        );
        if (!step) return 0;
        const bookings: Booking[] = step.due
            .map(({ dueDate }) => ({
                id: newId(),
                date: startOfDayIn(dueDate, timeZone),
            }))
            // An archived account takes no new entries; the cursor still moves past them.
            .filter(({ date }) => !archivedAt || date < archivedAt);
        const moved = await this.recurring.book(rule, bookings, step.cursor);
        return moved ? bookings.length : 0;
    }

    private async save(
        householdId: Id,
        entity: Parameters<RecurringRepository['update']>[1],
    ): Promise<RecurringTransaction> {
        const saved = await this.recurring.update(householdId, entity);
        if (!saved) throw new NotFoundError('RecurringTransaction', entity.id);
        return saved;
    }

    private async saveWithoutUpcoming(
        householdId: Id,
        entity: Parameters<RecurringRepository['update']>[1],
    ): Promise<RecurringTransaction> {
        const saved = await this.recurring.replaceWithUpcoming(
            householdId,
            entity,
            this.clock.now(),
        );
        if (!saved) throw new NotFoundError('RecurringTransaction', entity.id);
        return saved;
    }

    private async get(householdId: Id, id: Id): Promise<RecurringTransaction> {
        const found = await this.recurring.findById(householdId, id);
        if (!found) throw new NotFoundError('RecurringTransaction', id);
        return found;
    }

    private async today(householdId: Id): Promise<LocalDate> {
        const household = await this.households.getById(householdId);
        return todayIn(household.timeZone, this.clock.now());
    }

    /** Backfill reaches at most a year back. */
    private assertStartDate(
        fields: RecurringTransactionFields,
        today: LocalDate,
    ): void {
        if (fields.startDate < addYears(today, -1)) {
            throw new ValidationError(
                'Start date can be at most one year in the past',
            );
        }
    }

    private async assertReferences(
        householdId: Id,
        fields: RecurringTransactionFields,
    ): Promise<void> {
        if (
            !(await this.recurring.accountExists(householdId, fields.accountId))
        ) {
            throw new NotFoundError('Account', fields.accountId);
        }
        if (
            fields.categoryId &&
            !(await this.recurring.categoryExists(
                householdId,
                fields.categoryId,
            ))
        ) {
            throw new NotFoundError('Category', fields.categoryId);
        }
    }

    private serial<T>(work: () => Promise<T>): Promise<T> {
        const result = this.queue.then(work);
        this.queue = result.catch(() => undefined);
        return result;
    }
}

function withNextDate(
    rule: RecurringTransaction,
    today: LocalDate,
): RecurringTransactionView {
    return { ...rule, nextDate: nextDate(rule, rule.lastOccurrence, today) };
}
