import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
    type Clock,
} from '../../../shared/kernel/index.js';
import { makeHousehold } from '../../../../test/fixtures/household.js';
import type { HouseholdService } from '../../household/service/household.service.js';
import type {
    CreateRecurringTransaction,
    RecurringTransaction,
    RecurringTransactionInput,
} from '../model/recurring.js';
import type {
    Booking,
    RecurringRepository,
} from '../repository/recurring.repository.js';
import { RecurringService } from './recurring.service.js';

const input: RecurringTransactionInput = {
    accountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 180000,
    title: 'Rent',
    interval: 'monthly',
    startDate: '2026-07-31',
};

/** In-memory stand-in with the repository's semantics, including the cursor compare-and-set. */
class FakeRepo implements Pick<
    RecurringRepository,
    | 'listByHouseholdId'
    | 'findById'
    | 'accountExists'
    | 'categoryExists'
    | 'create'
    | 'update'
    | 'replaceWithUpcoming'
    | 'delete'
    | 'findDueCandidates'
    | 'book'
> {
    rules = new Map<string, RecurringTransaction>();
    booked: (Booking & { ruleId: string })[] = [];
    archivedAt: Date | null = null;
    failFor = new Set<string>();

    listByHouseholdId = vi.fn(async () => [...this.rules.values()]);
    findById = vi.fn(
        async (_h: string, id: string) => this.rules.get(id) ?? null,
    );
    accountExists = vi.fn(async () => true);
    categoryExists = vi.fn(async () => true);
    create = vi.fn(async (entity: CreateRecurringTransaction) => {
        const rule = { ...entity, createdAt: new Date() };
        this.rules.set(rule.id, rule);
        return rule;
    });
    update = vi.fn(async (_h: string, entity: CreateRecurringTransaction) => {
        const existing = this.rules.get(entity.id);
        if (!existing) return null;
        const rule = { ...existing, ...entity };
        this.rules.set(rule.id, rule);
        return rule;
    });
    replaceWithUpcoming = vi.fn(
        async (h: string, entity: CreateRecurringTransaction, now: Date) => {
            if (!this.rules.has(entity.id)) return null;
            this.removeUpcoming(entity.id, now);
            return this.update(h, entity);
        },
    );
    delete = vi.fn(async (_h: string, id: string, now: Date) => {
        if (!this.rules.has(id)) return false;
        this.removeUpcoming(id, now);
        return this.rules.delete(id);
    });
    findDueCandidates = vi.fn(async (latest: string, ruleId?: string) =>
        [...this.rules.values()]
            .filter(
                (rule) =>
                    !rule.paused &&
                    rule.nextDueDate <= latest &&
                    (!ruleId || rule.id === ruleId),
            )
            .map((rule) => ({
                rule,
                timeZone: 'Europe/Zurich',
                archivedAt: this.archivedAt,
            })),
    );
    book = vi.fn(
        async (
            rule: RecurringTransaction,
            bookings: Booking[],
            cursor: Parameters<RecurringRepository['book']>[2],
        ) => {
            if (this.failFor.has(rule.id)) throw new Error('boom');
            const current = this.rules.get(rule.id);
            if (current?.nextOccurrence !== rule.nextOccurrence) return false;
            this.booked.push(
                ...bookings.map((b) => ({ ...b, ruleId: rule.id })),
            );
            this.rules.set(rule.id, { ...current, ...cursor });
            return true;
        },
    );

    private removeUpcoming(ruleId: string, now: Date): void {
        this.booked = this.booked.filter(
            (b) => b.ruleId !== ruleId || b.date <= now,
        );
    }
}

function setup(now = '2026-09-26T10:00:00.000Z') {
    const repo = new FakeRepo();
    const clock = { current: new Date(now) };
    const households: Pick<HouseholdService, 'getById'> = {
        getById: vi.fn().mockResolvedValue(makeHousehold()),
    };
    const service = new RecurringService(
        repo as unknown as RecurringRepository,
        households as HouseholdService,
        { now: () => clock.current } satisfies Clock,
    );
    const bookedDates = () => repo.booked.map((b) => b.date.toISOString());
    return { repo, clock, service, bookedDates };
}

describe('RecurringService', () => {
    describe('create', () => {
        it('books past occurrences and the rest of the month at local midnight', async () => {
            const { service, bookedDates } = setup();
            const rule = await service.create('h1', input);
            expect(bookedDates()).toEqual([
                '2026-07-30T22:00:00.000Z',
                '2026-08-30T22:00:00.000Z',
                // 30 Sep is still ahead: booked with the month.
                '2026-09-29T22:00:00.000Z',
            ]);
            expect(rule.nextDueDate).toBe('2026-10-31');
            expect(rule.lastOccurrence).toBe('2026-09-30');
            // Shown to the user: 30 Sep is still ahead.
            expect(rule.nextDate).toBe('2026-09-30');
        });

        it('books nothing for a start next month', async () => {
            const { service, repo } = setup();
            await service.create('h1', { ...input, startDate: '2026-10-01' });
            expect(repo.booked).toEqual([]);
        });

        it('rejects a start date more than a year back', async () => {
            const { service, repo } = setup();
            await expect(
                service.create('h1', { ...input, startDate: '2025-09-25' }),
            ).rejects.toBeInstanceOf(ValidationError);
            expect(repo.create).not.toHaveBeenCalled();
            await service.create('h1', { ...input, startDate: '2025-09-26' });
        });

        it('rejects an account or category outside the household', async () => {
            const { service, repo } = setup();
            repo.accountExists.mockResolvedValueOnce(false);
            await expect(service.create('h1', input)).rejects.toBeInstanceOf(
                NotFoundError,
            );
            repo.categoryExists.mockResolvedValueOnce(false);
            await expect(service.create('h1', input)).rejects.toBeInstanceOf(
                NotFoundError,
            );
        });
    });

    describe('runDue', () => {
        it('books a new month once its first local day has started', async () => {
            const { service, clock } = setup();
            await service.create('h1', input);

            clock.current = new Date('2026-09-30T21:59:00.000Z');
            expect(await service.runDue()).toBe(0);
            // 1 Oct, 00:00 in Zurich: the 31 Oct rent appears.
            clock.current = new Date('2026-09-30T22:00:00.000Z');
            expect(await service.runDue()).toBe(1);
            expect(await service.runDue()).toBe(0);
        });

        it('catches up on every month missed while down', async () => {
            const { service, clock, repo } = setup();
            await service.create('h1', { ...input, startDate: '2026-10-31' });
            clock.current = new Date('2027-01-15T10:00:00.000Z');
            // Oct, Nov, Dec and the rest of January.
            expect(await service.runDue()).toBe(4);
            expect(repo.booked).toHaveLength(4);
        });

        it('skips occurrences from the archive date on but still moves the cursor', async () => {
            const { service, repo, clock } = setup();
            const rule = await service.create('h1', {
                ...input,
                startDate: '2026-10-31',
            });
            repo.archivedAt = new Date('2026-11-15T00:00:00.000Z');
            clock.current = new Date('2027-01-15T10:00:00.000Z');
            expect(await service.runDue()).toBe(1);
            expect(repo.rules.get(rule.id)?.nextDueDate).toBe('2027-02-28');
        });

        it('keeps booking other rules when one fails', async () => {
            const { service, repo, clock } = setup();
            const failing = await service.create('h1', {
                ...input,
                startDate: '2026-10-01',
            });
            await service.create('h1', { ...input, startDate: '2026-10-02' });
            repo.failFor.add(failing.id);
            const logged = vi
                .spyOn(Logger.prototype, 'error')
                .mockImplementation(() => undefined);
            clock.current = new Date('2026-10-02T10:00:00.000Z');
            expect(await service.runDue()).toBe(1);
            expect(repo.rules.get(failing.id)?.nextDueDate).toBe('2026-10-01');
            expect(logged).toHaveBeenCalledOnce();
            logged.mockRestore();
        });
    });

    describe('update', () => {
        it('re-creates upcoming transactions from the new values and keeps passed ones', async () => {
            const { service, repo } = setup();
            const rule = await service.create('h1', input);
            const [july, august, september] = repo.booked;

            await service.update('h1', rule.id, { ...input, amount: 190000 });

            expect(repo.booked).toHaveLength(3);
            expect(repo.booked.slice(0, 2)).toEqual([july, august]);
            expect(repo.booked[2]?.date).toEqual(september?.date);
            expect(repo.booked[2]?.id).not.toBe(september?.id);
        });

        it('continues after the last passed occurrence when the day moves', async () => {
            const { service, repo, bookedDates } = setup();
            const rule = await service.create('h1', input);
            const updated = await service.update('h1', rule.id, {
                ...input,
                dayOfMonth: 1,
            });
            // 30 Sep was upcoming and goes; 1 Sep follows the passed 31 Aug.
            expect(bookedDates()).toEqual([
                '2026-07-30T22:00:00.000Z',
                '2026-08-30T22:00:00.000Z',
                '2026-08-31T22:00:00.000Z',
            ]);
            expect(updated.nextDueDate).toBe('2026-10-01');
            expect(repo.replaceWithUpcoming).toHaveBeenCalled();
        });

        it('allows keeping a start date that has fallen more than a year back', async () => {
            const { service, clock } = setup();
            const rule = await service.create('h1', input);
            clock.current = new Date('2027-09-01T10:00:00.000Z');
            await service.runDue();
            await expect(
                service.update('h1', rule.id, { ...input, amount: 1 }),
            ).resolves.toMatchObject({ amount: 1 });
        });

        it('throws NotFoundError for an unknown rule', async () => {
            const { service } = setup();
            await expect(
                service.update('h1', 'missing', input),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

    describe('pause and resume', () => {
        it('pausing removes upcoming transactions and books nothing more', async () => {
            const { service, repo, clock } = setup();
            const rule = await service.create('h1', input);
            const paused = await service.pause('h1', rule.id);

            expect(repo.booked).toHaveLength(2);
            expect(paused).toMatchObject({
                paused: true,
                nextDueDate: '2026-09-30',
            });
            clock.current = new Date('2026-12-15T10:00:00.000Z');
            expect(await service.runDue()).toBe(0);
        });

        it('resuming skips what fell into the pause and books the rest of the month', async () => {
            const { service, repo, clock } = setup();
            const rule = await service.create('h1', input);
            await service.pause('h1', rule.id);
            clock.current = new Date('2026-12-15T10:00:00.000Z');

            const resumed = await service.resume('h1', rule.id);

            expect(resumed.paused).toBe(false);
            expect(repo.booked.map((b) => b.date.toISOString())).toEqual([
                '2026-07-30T22:00:00.000Z',
                '2026-08-30T22:00:00.000Z',
                '2026-12-30T23:00:00.000Z',
            ]);
            expect(resumed.nextDueDate).toBe('2027-01-31');
        });

        it('resuming in the same month books the removed upcoming ones again', async () => {
            const { service, repo } = setup();
            const rule = await service.create('h1', input);
            await service.pause('h1', rule.id);
            await service.resume('h1', rule.id);
            expect(repo.booked).toHaveLength(3);
        });
    });

    describe('delete', () => {
        it('removes upcoming transactions and keeps passed ones', async () => {
            const { service, repo } = setup();
            const rule = await service.create('h1', input);
            await service.delete('h1', rule.id);
            expect(repo.booked).toHaveLength(2);
            expect(repo.rules.size).toBe(0);
        });

        it('lists active rules first, soonest next booking first', async () => {
            const { service } = setup();
            const later = await service.create('h1', {
                ...input,
                startDate: '2026-10-05',
            });
            const sooner = await service.create('h1', input);
            const paused = await service.create('h1', {
                ...input,
                startDate: '2026-09-27',
            });
            await service.pause('h1', paused.id);
            expect((await service.getAll('h1')).map((r) => r.id)).toEqual([
                sooner.id,
                later.id,
                paused.id,
            ]);
        });

        it('throws NotFoundError when nothing was deleted', async () => {
            const { service } = setup();
            await expect(
                service.delete('h1', 'missing'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });
});
