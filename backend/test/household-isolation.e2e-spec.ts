import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

/**
 * A member of one household must not reach another household's accounts and transactions:
 * neither through the other household's URL (guard) nor by passing its ids through their own (repository scope).
 */
describe('household isolation (e2e)', () => {
    let app: INestApplication;
    let intruder: string;
    let victim: {
        householdId: string;
        accountId: string;
        transactionId: string;
    };
    let own: { householdId: string; accountId: string };

    const server = () => request(app.getHttpServer());
    const account = {
        description: 'Checking',
        currency: 'CHF',
        type: 'checking',
        initialValue: 100000,
        startDate: '2026-01-01',
    };

    async function onboard(cookie: string, name: string) {
        const res = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({ name, categoryNames: ['Food'], accounts: [account] })
            .expect(201);
        const accounts = await server()
            .get(`/api/households/${res.body.id}/accounts`)
            .set('Cookie', cookie)
            .expect(200);
        return { householdId: res.body.id, accountId: accounts.body[0].id };
    }

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await app.init();

        const signIn = await server()
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        const demo = signIn.headers['set-cookie'][0].split(';')[0];
        const victimHousehold = await onboard(demo, 'Victim');
        const tx = await server()
            .post(`/api/households/${victimHousehold.householdId}/transactions`)
            .set('Cookie', demo)
            .send({
                accountId: victimHousehold.accountId,
                type: 'expense',
                amount: 500,
                title: 'Secret',
                date: '2026-02-01T12:00:00.000Z',
            })
            .expect(201);
        victim = { ...victimHousehold, transactionId: tx.body.id };

        const signUp = await server()
            .post('/api/auth/sign-up/email')
            .send({
                email: 'intruder@finance.local',
                password: 'intruder-password',
                name: 'Intruder',
            })
            .expect(200);
        intruder = signUp.headers['set-cookie'][0].split(';')[0];
        own = await onboard(intruder, 'Intruder');
    });

    afterAll(() => app?.close());

    describe("through the other household's URL", () => {
        const url = (path: string) =>
            `/api/households/${victim.householdId}${path}`;

        it.each([
            ['GET', '/accounts'],
            ['GET', '/transactions'],
            ['GET', '/transactions/stats?from=2026-01-01&to=2027-01-01'],
        ])('%s %s is 403', async (_method, path) => {
            await server().get(url(path)).set('Cookie', intruder).expect(403);
        });

        it('cannot create, edit or delete there', async () => {
            await server()
                .post(url('/transactions'))
                .set('Cookie', intruder)
                .send({
                    accountId: victim.accountId,
                    type: 'expense',
                    amount: 1,
                    date: '2026-02-01T12:00:00.000Z',
                })
                .expect(403);
            await server()
                .patch(url(`/accounts/${victim.accountId}`))
                .set('Cookie', intruder)
                .send({ ...account, archivedAt: null })
                .expect(403);
            await server()
                .delete(url(`/transactions/${victim.transactionId}`))
                .set('Cookie', intruder)
                .expect(403);
            await server()
                .patch(`/api/households/${victim.householdId}`)
                .set('Cookie', intruder)
                .send({ name: 'Taken over' })
                .expect(403);
        });
    });

    describe("with the other household's ids under their own URL", () => {
        const url = (path: string) =>
            `/api/households/${own.householdId}${path}`;

        it('cannot book onto a foreign account', async () => {
            await server()
                .post(url('/transactions'))
                .set('Cookie', intruder)
                .send({
                    accountId: victim.accountId,
                    type: 'expense',
                    amount: 1,
                    date: '2026-02-01T12:00:00.000Z',
                })
                .expect(404);
        });

        it('cannot edit or delete a foreign transaction', async () => {
            await server()
                .patch(url(`/transactions/${victim.transactionId}`))
                .set('Cookie', intruder)
                .send({
                    accountId: own.accountId,
                    type: 'expense',
                    amount: 1,
                    date: '2026-02-01T12:00:00.000Z',
                })
                .expect(404);
            await server()
                .delete(url(`/transactions/${victim.transactionId}`))
                .set('Cookie', intruder)
                .expect(404);
        });

        it('cannot edit or delete a foreign account', async () => {
            await server()
                .patch(url(`/accounts/${victim.accountId}`))
                .set('Cookie', intruder)
                .send({ ...account, archivedAt: null })
                .expect(404);
            await server()
                .delete(url(`/accounts/${victim.accountId}`))
                .set('Cookie', intruder)
                .expect(404);
        });

        it('filtering by a foreign account reveals nothing', async () => {
            const res = await server()
                .get(url(`/transactions?accountId=${victim.accountId}`))
                .set('Cookie', intruder)
                .expect(200);
            expect(res.body).toMatchObject({ items: [], total: 0 });
        });

        it('sees only its own accounts', async () => {
            const res = await server()
                .get(url('/accounts'))
                .set('Cookie', intruder)
                .expect(200);
            expect(res.body.map((a: { id: string }) => a.id)).toEqual([
                own.accountId,
            ]);
        });
    });

    it("leaves the victim's data untouched", async () => {
        const signIn = await server()
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        const demo = signIn.headers['set-cookie'][0].split(';')[0];
        const res = await server()
            .get(`/api/households/${victim.householdId}/transactions`)
            .set('Cookie', demo)
            .expect(200);

        expect(res.body.items).toEqual([
            expect.objectContaining({
                id: victim.transactionId,
                title: 'Secret',
                amount: 500,
            }),
        ]);
        const accounts = await server()
            .get(`/api/households/${victim.householdId}/accounts`)
            .set('Cookie', demo)
            .expect(200);
        expect(accounts.body[0]).toMatchObject({
            id: victim.accountId,
            description: 'Checking',
            amount: 100000 - 500,
        });
    });
});
