import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { RecurringService } from '../src/features/recurring/service/recurring.service.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { CLOCK, type Clock } from '../src/shared/kernel/index.js';
import { signUpVerified } from './support/auth.js';
import { prepareTestDb } from './setup-db.js';
import { listenOnLoopback } from './setup-app.js';

/** Recurring transactions book their month ahead. The scheduler is off (vitest.config.e2e.ts); runs are triggered with a fixed clock. */
describe('recurring transactions (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let accountId: string;
    let categoryId: string;
    const clock = { current: new Date('2026-09-26T10:00:00.000Z') };

    const server = () => request(app.getHttpServer());
    const url = () => `/api/households/${householdId}/recurring-transactions`;
    const transactionsUrl = () => `/api/households/${householdId}/transactions`;
    const rent = () => ({
        accountId,
        categoryId,
        type: 'expense',
        amount: 180000,
        title: 'Rent',
        interval: 'monthly',
        startDate: '2026-07-31',
    });
    const fromRule = async (ruleId: string) => {
        const res = await server()
            .get(transactionsUrl())
            .query({ pageSize: 100 })
            .set('Cookie', cookie)
            .expect(200);
        return (
            res.body.items as {
                id: string;
                recurringTransactionId: string | null;
                date: string;
                amount: number;
                needsConfirmation: boolean;
            }[]
        ).filter((t) => t.recurringTransactionId === ruleId);
    };
    const runDue = () => app.get(RecurringService).runDue();

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(CLOCK)
            .useValue({ now: () => clock.current } satisfies Clock)
            .compile();
        app = setupApp(moduleRef.createNestApplication());
        await listenOnLoopback(app);

        cookie = await signUpVerified(app, {
            email: 'recurring@finance.local',
            password: 'recurring-password',
            name: 'Recurring',
        });
        const onboarding = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({
                name: 'Recurring home',
                timeZone: 'Europe/Zurich',
                categoryNames: ['Housing'],
                accounts: [
                    {
                        description: 'Checking',
                        currency: 'CHF',
                        type: 'checking',
                        initialValue: 1000000,
                        startDate: '2025-01-01',
                    },
                ],
            })
            .expect(201);
        householdId = onboarding.body.id;
        expect(onboarding.body.timeZone).toBe('Europe/Zurich');
        const [accounts, categories] = await Promise.all([
            server()
                .get(`/api/households/${householdId}/accounts`)
                .set('Cookie', cookie),
            server()
                .get(`/api/households/${householdId}/categories`)
                .set('Cookie', cookie),
        ]);
        accountId = accounts.body[0].id;
        categoryId = categories.body[0].id;
    });

    afterAll(() => app?.close());

    it('rejects anonymous access with 401', async () => {
        await server()
            .get('/api/households/x/recurring-transactions')
            .expect(401);
    });

    it('creates a rule and books past occurrences plus the rest of the month at local midnight', async () => {
        const res = await server()
            .post(url())
            .set('Cookie', cookie)
            .send(rent())
            .expect(201);
        expect(res.body).toMatchObject({
            interval: 'monthly',
            dayOfMonth: 31,
            weekday: null,
            paused: false,
            nextDate: '2026-09-30',
        });
        const booked = await fromRule(res.body.id);
        expect(booked.map((t) => t.date).sort()).toEqual([
            '2026-07-30T22:00:00.000Z',
            '2026-08-30T22:00:00.000Z',
            // 30 Sep is upcoming, booked with its month.
            '2026-09-29T22:00:00.000Z',
        ]);
    });

    it('books a new month once its first local midnight passed, only once', async () => {
        const [rule] = (
            await server().get(url()).set('Cookie', cookie).expect(200)
        ).body;
        // runDue covers every household (the seeded sample one too), so count this rule's rows.
        clock.current = new Date('2026-09-30T21:59:00.000Z');
        await runDue();
        expect(await fromRule(rule.id)).toHaveLength(3);
        // 1 Oct, 00:00:30 in Zurich.
        clock.current = new Date('2026-09-30T22:00:30.000Z');
        await runDue();
        expect(await fromRule(rule.id)).toHaveLength(4);
        expect(await runDue()).toBe(0);
    });

    it('rejects a start date more than a year back and malformed input with 400', async () => {
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...rent(), startDate: '2025-09-01' })
            .expect(400);
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...rent(), startDate: '2026-02-30' })
            .expect(400);
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...rent(), interval: 'hourly' })
            .expect(400);
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...rent(), accountId: 'foreign' })
            .expect(404);
    });

    it('shifts weekend occurrences to the Friday before, into that month (weekly ignores the option)', async () => {
        // 1 Nov 2026 is a Sunday: booked Fri 30 Oct, so it belongs to October and is booked now.
        const res = await server()
            .post(url())
            .set('Cookie', cookie)
            .send({
                ...rent(),
                title: 'Salary',
                type: 'income',
                startDate: '2026-11-01',
                weekendShift: true,
            })
            .expect(201);
        expect(res.body).toMatchObject({
            weekendShift: true,
            nextDate: '2026-10-30',
        });
        expect((await fromRule(res.body.id)).map((t) => t.date)).toEqual([
            '2026-10-29T23:00:00.000Z',
        ]);
        const weekly = await server()
            .post(url())
            .set('Cookie', cookie)
            .send({
                ...rent(),
                interval: 'weekly',
                weekday: 5,
                startDate: '2026-11-01',
                weekendShift: true,
            })
            .expect(201);
        expect(weekly.body).toMatchObject({
            weekendShift: false,
            weekday: 5,
            dayOfMonth: null,
            nextDate: '2026-11-06',
        });
    });

    describe('varying amount', () => {
        let ruleId: string;

        it('flags booked transactions for confirmation and filters them', async () => {
            const res = await server()
                .post(url())
                .set('Cookie', cookie)
                .send({
                    ...rent(),
                    title: 'Electricity',
                    interval: 'quarterly',
                    startDate: '2026-09-01',
                    dayOfMonth: 1,
                    varyingAmount: true,
                })
                .expect(201);
            ruleId = res.body.id;
            const flagged = await server()
                .get(transactionsUrl())
                .query({ needsConfirmation: true })
                .set('Cookie', cookie)
                .expect(200);
            expect(flagged.body.total).toBe(1);
            expect(flagged.body.items[0]).toMatchObject({
                recurringTransactionId: ruleId,
                needsConfirmation: true,
            });
        });

        it('leaves upcoming transactions out of the confirmation filter', async () => {
            // Clock: 1 Oct. 20 Oct is booked now but has not come due.
            const res = await server()
                .post(url())
                .set('Cookie', cookie)
                .send({
                    ...rent(),
                    title: 'Phone',
                    startDate: '2026-10-20',
                    varyingAmount: true,
                })
                .expect(201);
            const [upcoming] = await fromRule(res.body.id);
            expect(upcoming).toMatchObject({ needsConfirmation: true });
            const flagged = await server()
                .get(transactionsUrl())
                .query({ needsConfirmation: true })
                .set('Cookie', cookie)
                .expect(200);
            expect(flagged.body.total).toBe(1);

            // Deleting the recurring transaction takes its upcoming transaction along.
            await server()
                .delete(`${url()}/${res.body.id}`)
                .set('Cookie', cookie)
                .expect(204);
            await server()
                .get(`${transactionsUrl()}`)
                .query({ from: '2026-10-19T00:00:00.000Z' })
                .set('Cookie', cookie)
                .expect(200)
                .expect((list) =>
                    expect(
                        list.body.items.map((t: { title: string }) => t.title),
                    ).not.toContain('Phone'),
                );
        });

        it('confirm clears the flag', async () => {
            const [booked] = await fromRule(ruleId);
            const res = await server()
                .post(`${transactionsUrl()}/${booked!.id}/confirm`)
                .set('Cookie', cookie)
                .expect(200);
            expect(res.body.needsConfirmation).toBe(false);
            expect(res.body.recurringTransactionId).toBe(ruleId);
        });

        it('editing a flagged transaction clears the flag and keeps the link', async () => {
            clock.current = new Date('2026-12-01T10:00:00.000Z');
            await runDue();
            const flagged = await server()
                .get(transactionsUrl())
                .query({ needsConfirmation: 'true' })
                .set('Cookie', cookie)
                .expect(200);
            const tx = flagged.body.items.find(
                (t: { recurringTransactionId: string }) =>
                    t.recurringTransactionId === ruleId,
            );
            const res = await server()
                .patch(`${transactionsUrl()}/${tx.id}`)
                .set('Cookie', cookie)
                .send({
                    accountId,
                    categoryId,
                    type: 'expense',
                    amount: 21350,
                    title: 'Electricity',
                    date: tx.date,
                })
                .expect(200);
            expect(res.body).toMatchObject({
                amount: 21350,
                needsConfirmation: false,
                recurringTransactionId: ruleId,
            });
        });
    });

    describe('manage', () => {
        let ruleId: string;
        let detachedId: string;

        it('lists active rules first, soonest due first', async () => {
            const res = await server()
                .get(url())
                .set('Cookie', cookie)
                .expect(200);
            ruleId = res.body.find(
                (r: { title: string }) => r.title === 'Rent',
            ).id;
            const dues = res.body.map((r: { nextDate: string }) => r.nextDate);
            expect(dues).toEqual([...dues].sort());
        });

        it('editing keeps passed transactions and re-creates upcoming ones from the new values', async () => {
            // Clock: 1 Dec. Booked: 31 Jul … 30 Nov (passed), 31 Dec (upcoming).
            const now = clock.current.toISOString();
            const before = await fromRule(ruleId);
            const res = await server()
                .patch(`${url()}/${ruleId}`)
                .set('Cookie', cookie)
                .send({ ...rent(), amount: 190000, dayOfMonth: 15 })
                .expect(200);
            expect(res.body).toMatchObject({ amount: 190000, dayOfMonth: 15 });
            expect(res.body.nextDate).toBe('2026-12-15');

            const after = await fromRule(ruleId);
            expect(after.filter((t) => t.date <= now)).toEqual(
                before.filter((t) => t.date <= now),
            );
            expect(
                after
                    .filter((t) => t.date > now)
                    .map((t) => ({ date: t.date, amount: t.amount })),
            ).toEqual([{ date: '2026-12-14T23:00:00.000Z', amount: 190000 }]);
        });

        it('splits the list into upcoming and the rest by date', async () => {
            const now = clock.current.toISOString();
            const list = async (query: Record<string, string>) =>
                (
                    await server()
                        .get(transactionsUrl())
                        .query({ ...query, pageSize: '100' })
                        .set('Cookie', cookie)
                        .expect(200)
                ).body.items.map((t: { date: string }) => t.date) as string[];
            const upcoming = await list({ from: now });
            const rest = await list({ before: now });
            expect(upcoming.length).toBeGreaterThan(0);
            expect(upcoming.every((d) => d >= now)).toBe(true);
            expect(rest.every((d) => d < now)).toBe(true);
            await server()
                .get(transactionsUrl())
                .query({ before: 'yesterday' })
                .set('Cookie', cookie)
                .expect(400);
        });

        it('editing an upcoming transaction by hand detaches it', async () => {
            const now = clock.current.toISOString();
            const upcoming = (await fromRule(ruleId)).find(
                (t) => t.date > now,
            )!;
            const res = await server()
                .patch(`${transactionsUrl()}/${upcoming.id}`)
                .set('Cookie', cookie)
                .send({
                    accountId,
                    categoryId,
                    type: 'expense',
                    amount: 185000,
                    title: 'Rent',
                    date: upcoming.date,
                })
                .expect(200);
            expect(res.body.recurringTransactionId).toBeNull();
            detachedId = upcoming.id;
        });

        it('pausing removes upcoming ones, resuming skips the paused occurrences', async () => {
            await server()
                .post(`${url()}/${ruleId}/pause`)
                .set('Cookie', cookie)
                .expect(200)
                .expect((res) => expect(res.body.paused).toBe(true));
            const count = (await fromRule(ruleId)).length;

            clock.current = new Date('2027-02-20T10:00:00.000Z');
            await runDue();
            expect(await fromRule(ruleId)).toHaveLength(count);

            const resumed = await server()
                .post(`${url()}/${ruleId}/resume`)
                .set('Cookie', cookie)
                .expect(200);
            expect(resumed.body).toMatchObject({
                paused: false,
                nextDate: '2027-03-15',
            });
            expect(await fromRule(ruleId)).toHaveLength(count);

            // The detached transaction was not the recurring transaction's to remove.
            const all = await server()
                .get(transactionsUrl())
                .query({ pageSize: 100 })
                .set('Cookie', cookie);
            expect(all.body.items.map((t: { id: string }) => t.id)).toContain(
                detachedId,
            );
        });

        it('archiving an account removes its upcoming recurring transactions', async () => {
            // Clock: 20 Feb 2027. 25 Feb is upcoming.
            const account = await server()
                .post(`/api/households/${householdId}/accounts`)
                .set('Cookie', cookie)
                .send({
                    description: 'Travel',
                    currency: 'CHF',
                    type: 'savings',
                    initialValue: 0,
                    startDate: '2026-01-01',
                })
                .expect(201);
            const rule = await server()
                .post(url())
                .set('Cookie', cookie)
                .send({
                    ...rent(),
                    accountId: account.body.id,
                    startDate: '2027-02-25',
                })
                .expect(201);
            expect(await fromRule(rule.body.id)).toHaveLength(1);

            await server()
                .patch(
                    `/api/households/${householdId}/accounts/${account.body.id}`,
                )
                .set('Cookie', cookie)
                .send({
                    description: 'Travel',
                    currency: 'CHF',
                    type: 'savings',
                    startDate: '2026-01-01',
                    archivedAt: clock.current.toISOString(),
                })
                .expect(200);
            expect(await fromRule(rule.body.id)).toHaveLength(0);
        });

        it('blocks deleting its account with 409', async () => {
            // The account has transactions too; an empty account with a rule is refused the same way.
            const account = await server()
                .post(`/api/households/${householdId}/accounts`)
                .set('Cookie', cookie)
                .send({
                    description: 'Spare',
                    currency: 'CHF',
                    type: 'savings',
                    initialValue: 0,
                    startDate: '2026-01-01',
                })
                .expect(201);
            await server()
                .post(url())
                .set('Cookie', cookie)
                .send({
                    ...rent(),
                    accountId: account.body.id,
                    startDate: '2027-06-01',
                })
                .expect(201);
            const res = await server()
                .delete(
                    `/api/households/${householdId}/accounts/${account.body.id}`,
                )
                .set('Cookie', cookie)
                .expect(409);
            expect(res.body.message).toMatch(/recurring/i);
        });

        it('deleting keeps the booked transactions and drops their link', async () => {
            const count = (await fromRule(ruleId)).length;
            const all = async () =>
                (
                    await server()
                        .get(transactionsUrl())
                        .query({ pageSize: 100 })
                        .set('Cookie', cookie)
                ).body.total as number;
            const total = await all();
            await server()
                .delete(`${url()}/${ruleId}`)
                .set('Cookie', cookie)
                .expect(204);
            expect(await fromRule(ruleId)).toHaveLength(0);
            expect(await all()).toBe(total);
            expect(count).toBeGreaterThan(0);
            await server()
                .delete(`${url()}/${ruleId}`)
                .set('Cookie', cookie)
                .expect(404);
        });
    });

    it('changing the household time zone moves later bookings to its midnight', async () => {
        await server()
            .patch(`/api/households/${householdId}`)
            .set('Cookie', cookie)
            .send({ timeZone: 'America/New_York' })
            .expect(200)
            .expect((res) =>
                expect(res.body.timeZone).toBe('America/New_York'),
            );
        await server()
            .patch(`/api/households/${householdId}`)
            .set('Cookie', cookie)
            .send({ timeZone: 'Mars/Base' })
            .expect(400);

        const created = await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...rent(), title: 'Gym', startDate: '2027-02-20' })
            .expect(201);
        const [booked] = await fromRule(created.body.id);
        expect(booked?.date).toBe('2027-02-20T05:00:00.000Z');
    });
});
