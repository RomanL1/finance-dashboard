import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { MAX_AMOUNT } from '../src/shared/kernel/index.js';
import { prepareTestDb } from './setup-db.js';

/** Account numbers are per household, start at 1, and follow the current max (deleting the highest frees its number). */
describe('account (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;

    const url = () => `/api/households/${householdId}/accounts`;
    const create = (description: string) =>
        request(app.getHttpServer())
            .post(url())
            .set('Cookie', cookie)
            .send({
                description,
                currency: 'CHF',
                type: 'checking',
                initialValue: 0,
                startDate: '2026-01-01',
            })
            .expect(201);

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await app.init();

        const signIn = await request(app.getHttpServer())
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        cookie = signIn.headers['set-cookie'][0].split(';')[0];

        const onboarding = await request(app.getHttpServer())
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({
                name: 'Demo Haushalt',
                categoryNames: ['Utilities'],
                accounts: [
                    {
                        description: 'Checking',
                        currency: 'CHF',
                        type: 'checking',
                        initialValue: 100000,
                        startDate: '2026-01-01',
                    },
                    {
                        description: 'Savings',
                        currency: 'CHF',
                        type: 'checking',
                        initialValue: 500000,
                        startDate: '2026-01-01',
                    },
                ],
            })
            .expect(201);
        householdId = onboarding.body.id;
    });

    afterAll(() => app?.close());

    it('numbers onboarding accounts 1..n in submitted order', async () => {
        const res = await request(app.getHttpServer())
            .get(url())
            .set('Cookie', cookie)
            .expect(200);
        const byNumber = [...res.body].sort(
            (a: { number: number }, b: { number: number }) =>
                a.number - b.number,
        );
        expect(
            byNumber.map((a: { number: number; description: string }) => [
                a.number,
                a.description,
            ]),
        ).toEqual([
            [1, 'Checking'],
            [2, 'Savings'],
        ]);
    });

    it('continues the sequence from the current max', async () => {
        const third = await create('Cash');
        expect(third.body.number).toBe(3);

        await request(app.getHttpServer())
            .delete(`${url()}/${third.body.id}`)
            .set('Cookie', cookie)
            .expect(204);

        // max is 2 again, so the next number is 3: the sequence follows the current max.
        const fourth = await create('Cash again');
        expect(fourth.body.number).toBe(3);
    });

    it('stores the account type and rejects an unknown one', async () => {
        const cash = await create('Wallet');
        expect(cash.body.type).toBe('checking');

        const updated = await request(app.getHttpServer())
            .patch(`${url()}/${cash.body.id}`)
            .set('Cookie', cookie)
            .send({
                description: 'Wallet',
                type: 'cash',
                currency: 'CHF',
                startDate: '2026-01-01',
            })
            .expect(200);
        expect(updated.body.type).toBe('cash');

        await request(app.getHttpServer())
            .post(url())
            .set('Cookie', cookie)
            .send({
                description: 'Bad',
                type: 'piggy_bank',
                currency: 'CHF',
                initialValue: 0,
                startDate: '2026-01-01',
            })
            .expect(400);
    });

    it('refuses to delete an account with transactions and keeps its history', async () => {
        const used = await create('Used');
        await request(app.getHttpServer())
            .post(`/api/households/${householdId}/transactions`)
            .set('Cookie', cookie)
            .send({
                accountId: used.body.id,
                type: 'expense',
                amount: 500,
                title: 'x',
                date: '2026-02-01',
            })
            .expect(201);

        await request(app.getHttpServer())
            .delete(`${url()}/${used.body.id}`)
            .set('Cookie', cookie)
            .expect(409);

        const list = await request(app.getHttpServer())
            .get(url())
            .set('Cookie', cookie)
            .expect(200);
        expect(
            list.body.find((a: { id: string }) => a.id === used.body.id).amount,
        ).toBe(-500);
    });

    it('POST accepts initialValue at ±cap and rejects beyond', async () => {
        const post = (initialValue: number) =>
            request(app.getHttpServer())
                .post(url())
                .set('Cookie', cookie)
                .send({
                    description: 'Capped',
                    currency: 'CHF',
                    type: 'checking',
                    initialValue,
                    startDate: '2026-01-01',
                });
        await post(MAX_AMOUNT).expect(201);
        await post(-MAX_AMOUNT).expect(201);
        await post(MAX_AMOUNT + 1).expect(400);
        await post(-MAX_AMOUNT - 1).expect(400);
    });

    it('onboarding accepts initialValue at ±cap and rejects beyond', async () => {
        const signUp = await request(app.getHttpServer())
            .post('/api/auth/sign-up/email')
            .send({
                email: 'cap@finance.local',
                password: 'cap-password',
                name: 'Cap',
            })
            .expect(200);
        const capCookie = signUp.headers['set-cookie'][0].split(';')[0];
        const onboard = (...initialValues: number[]) =>
            request(app.getHttpServer())
                .post('/api/households/onboarding')
                .set('Cookie', capCookie)
                .send({
                    name: 'Cap Haushalt',
                    categoryNames: ['Utilities'],
                    accounts: initialValues.map((initialValue, i) => ({
                        description: `Account ${i + 1}`,
                        currency: 'CHF',
                        type: 'checking',
                        initialValue,
                        startDate: '2026-01-01',
                    })),
                });
        await onboard(MAX_AMOUNT + 1).expect(400);
        await onboard(-MAX_AMOUNT - 1).expect(400);
        await onboard(MAX_AMOUNT, -MAX_AMOUNT).expect(201);
    });
});
