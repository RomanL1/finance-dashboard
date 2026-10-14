import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';
import { listenOnLoopback } from './setup-app.js';
import { signUpVerified } from './support/auth.js';

/**
 * Settling a credit card: a transfer moves money between two accounts of one household.
 * Both balances follow it; income, expense and category figures never see it.
 */
describe('transfer (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let checkingId: string;
    let cardId: string;
    let transferId: string;

    const server = () => request(app.getHttpServer());
    const url = (path = '') =>
        `/api/households/${householdId}/transfers${path}`;
    const balances = async () => {
        const res = await server()
            .get(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .expect(200);
        const byId = new Map<string, number>(
            res.body.map((a: { id: string; amount: number }) => [
                a.id,
                a.amount,
            ]),
        );
        return { checking: byId.get(checkingId), card: byId.get(cardId) };
    };
    const body = (amount: number, date = '2026-02-01T12:00:00.000Z') => ({
        fromAccountId: checkingId,
        toAccountId: cardId,
        amount,
        title: 'Card bill',
        date,
    });

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await listenOnLoopback(app);

        const signIn = await server()
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        cookie = signIn.headers['set-cookie'][0].split(';')[0];

        const onboarding = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({
                name: 'Transfer Haushalt',
                categoryNames: ['Streaming'],
                accounts: [
                    {
                        description: 'Checking',
                        currency: 'CHF',
                        type: 'checking',
                        initialValue: 100000,
                        startDate: '2026-01-01',
                    },
                    {
                        description: 'Visa',
                        currency: 'CHF',
                        type: 'credit_card',
                        initialValue: 0,
                        startDate: '2026-01-01',
                    },
                ],
            })
            .expect(201);
        householdId = onboarding.body.id;
        const accounts = await server()
            .get(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .expect(200);
        checkingId = accounts.body.find(
            (a: { type: string }) => a.type === 'checking',
        ).id;
        cardId = accounts.body.find(
            (a: { type: string }) => a.type === 'credit_card',
        ).id;

        // Card debt: a subscription paid by card.
        await server()
            .post(`/api/households/${householdId}/transactions`)
            .set('Cookie', cookie)
            .send({
                accountId: cardId,
                type: 'expense',
                amount: 2000,
                title: 'Streaming',
                date: '2026-01-20T12:00:00.000Z',
            })
            .expect(201);
    });

    afterAll(() => app?.close());

    it('POST moves the amount from payer to receiver', async () => {
        expect(await balances()).toEqual({ checking: 100000, card: -2000 });

        const res = await server()
            .post(url())
            .set('Cookie', cookie)
            .send(body(2000))
            .expect(201);
        transferId = res.body.id;
        expect(res.body).toMatchObject({
            fromAccountId: checkingId,
            toAccountId: cardId,
            amount: 2000,
            title: 'Card bill',
            date: '2026-02-01T12:00:00.000Z',
        });

        expect(await balances()).toEqual({ checking: 98000, card: 0 });
    });

    it('leaves income, expenses and category sums alone', async () => {
        const range = {
            from: '2026-01-01T00:00:00.000Z',
            to: '2026-03-01T00:00:00.000Z',
        };
        const stats = await server()
            .get(`/api/households/${householdId}/transactions/stats`)
            .query(range)
            .set('Cookie', cookie)
            .expect(200);
        expect(stats.body).toMatchObject({ income: 0, expenses: 2000 });

        const categories = await server()
            .get(`/api/households/${householdId}/transactions/stats/categories`)
            .query(range)
            .set('Cookie', cookie)
            .expect(200);
        expect(
            categories.body.categories.reduce(
                (sum: number, c: { expenses: number }) => sum + c.expenses,
                0,
            ),
        ).toBe(2000);

        const transactions = await server()
            .get(`/api/households/${householdId}/transactions`)
            .set('Cookie', cookie)
            .expect(200);
        expect(transactions.body.total).toBe(1);
    });

    it('GET lists newest first and filters by either side', async () => {
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({
                ...body(500, '2026-02-10T12:00:00.000Z'),
                fromAccountId: cardId,
                toAccountId: checkingId,
            })
            .expect(201);

        const all = await server().get(url()).set('Cookie', cookie).expect(200);
        expect(all.body.total).toBe(2);
        expect(all.body.items.map((t: { amount: number }) => t.amount)).toEqual(
            [500, 2000],
        );

        for (const accountId of [checkingId, cardId]) {
            const filtered = await server()
                .get(url())
                .query({ accountId })
                .set('Cookie', cookie)
                .expect(200);
            expect(filtered.body.total).toBe(2);
        }
        expect(await balances()).toEqual({ checking: 98500, card: -500 });
    });

    it('PATCH replaces the transfer and the balances follow', async () => {
        const res = await server()
            .patch(url(`/${transferId}`))
            .set('Cookie', cookie)
            .send({ ...body(1500), title: null })
            .expect(200);
        expect(res.body).toMatchObject({
            id: transferId,
            amount: 1500,
            title: null,
        });
        expect(await balances()).toEqual({ checking: 99000, card: -1000 });
    });

    it('rejects the same account on both sides and bad amounts', async () => {
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...body(100), toAccountId: checkingId })
            .expect(400);
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send(body(0))
            .expect(400);
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send(body(1.5))
            .expect(400);
    });

    it('keeps an account with transfers from being deleted', async () => {
        const res = await server()
            .post(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .send({
                description: 'Savings',
                currency: 'CHF',
                type: 'savings',
                initialValue: 0,
                startDate: '2026-01-01',
            })
            .expect(201);
        const savingsId = res.body.id;
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({ ...body(100), toAccountId: savingsId })
            .expect(201);

        await server()
            .delete(`/api/households/${householdId}/accounts/${savingsId}`)
            .set('Cookie', cookie)
            .expect(409);
    });

    it('rejects an account archived at the transfer date', async () => {
        const res = await server()
            .post(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .send({
                description: 'Old card',
                currency: 'CHF',
                type: 'credit_card',
                initialValue: 0,
                startDate: '2026-01-01',
            })
            .expect(201);
        await server()
            .patch(`/api/households/${householdId}/accounts/${res.body.id}`)
            .set('Cookie', cookie)
            .send({
                description: 'Old card',
                currency: 'CHF',
                type: 'credit_card',
                startDate: '2026-01-01',
                archivedAt: '2026-02-01T00:00:00.000Z',
            })
            .expect(200);

        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({
                ...body(100, '2026-02-15T12:00:00.000Z'),
                toAccountId: res.body.id,
            })
            .expect(400);
        await server()
            .post(url())
            .set('Cookie', cookie)
            .send({
                ...body(100, '2026-01-15T12:00:00.000Z'),
                toAccountId: res.body.id,
            })
            .expect(201);
    });

    it('DELETE removes the transfer and restores the balances', async () => {
        const before = await balances();
        await server()
            .delete(url(`/${transferId}`))
            .set('Cookie', cookie)
            .expect(204);
        expect(await balances()).toEqual({
            checking: before.checking! + 1500,
            card: before.card! - 1500,
        });
        await server()
            .delete(url(`/${transferId}`))
            .set('Cookie', cookie)
            .expect(404);
    });

    describe('household isolation', () => {
        let intruder: string;
        let own: { householdId: string; accountId: string };

        beforeAll(async () => {
            intruder = await signUpVerified(app, {
                email: 'transfer-intruder@finance.local',
                password: 'intruder-password',
                name: 'Intruder',
            });
            const res = await server()
                .post('/api/households/onboarding')
                .set('Cookie', intruder)
                .send({
                    name: 'Intruder',
                    categoryNames: ['Food'],
                    accounts: [
                        {
                            description: 'Checking',
                            currency: 'CHF',
                            type: 'checking',
                            initialValue: 0,
                            startDate: '2026-01-01',
                        },
                    ],
                })
                .expect(201);
            const accounts = await server()
                .get(`/api/households/${res.body.id}/accounts`)
                .set('Cookie', intruder)
                .expect(200);
            own = { householdId: res.body.id, accountId: accounts.body[0].id };
        });

        it("cannot reach the other household's transfers", async () => {
            await server().get(url()).set('Cookie', intruder).expect(403);
        });

        it('cannot move money from a foreign account through its own household', async () => {
            await server()
                .post(`/api/households/${own.householdId}/transfers`)
                .set('Cookie', intruder)
                .send({
                    fromAccountId: checkingId,
                    toAccountId: own.accountId,
                    amount: 100,
                    date: '2026-02-01T12:00:00.000Z',
                })
                .expect(404);
        });

        it('cannot list, edit or delete a foreign transfer through its own household', async () => {
            const all = await server()
                .get(url())
                .set('Cookie', cookie)
                .expect(200);
            const foreignId = all.body.items[0].id;
            const ownUrl = `/api/households/${own.householdId}/transfers`;

            const list = await server()
                .get(ownUrl)
                .set('Cookie', intruder)
                .expect(200);
            expect(list.body.total).toBe(0);
            await server()
                .delete(`${ownUrl}/${foreignId}`)
                .set('Cookie', intruder)
                .expect(404);
        });
    });
});
