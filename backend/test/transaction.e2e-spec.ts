import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

/** Balance is derived from transactions: create, edit and delete must all be reflected. */
describe('transaction (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let accountId: string;
    let transactionId: string;

    const url = () => `/api/households/${householdId}/transactions`;
    const balance = async () => {
        const res = await request(app.getHttpServer())
            .get(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .expect(200);
        return res.body[0].amount as number;
    };
    const body = (type: 'expense' | 'income', amount: number) => ({
        accountId,
        type,
        amount,
        title: 'Groceries',
        date: '2026-01-15T12:30:00.000Z',
    });

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
                        initialValue: 100000,
                        startDate: '2026-01-01',
                    },
                ],
            })
            .expect(201);
        householdId = onboarding.body.id;
        const accounts = await request(app.getHttpServer())
            .get(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .expect(200);
        accountId = accounts.body[0].id;
    });

    afterAll(() => app?.close());

    it('POST expense lowers the balance', async () => {
        const res = await request(app.getHttpServer())
            .post(url())
            .set('Cookie', cookie)
            .send(body('expense', 1250))
            .expect(201);
        transactionId = res.body.id;
        expect(await balance()).toBe(98750);
    });

    it('PATCH replaces the row and the balance follows', async () => {
        const res = await request(app.getHttpServer())
            .patch(`${url()}/${transactionId}`)
            .set('Cookie', cookie)
            .send(body('income', 500))
            .expect(200);
        expect(res.body).toMatchObject({
            id: transactionId,
            type: 'income',
            amount: 500,
        });
        expect(await balance()).toBe(100500);
    });

    it('PATCH unknown id returns 404', async () => {
        await request(app.getHttpServer())
            .patch(`${url()}/nope`)
            .set('Cookie', cookie)
            .send(body('income', 500))
            .expect(404);
    });

    it('DELETE removes the row and restores the balance', async () => {
        await request(app.getHttpServer())
            .delete(`${url()}/${transactionId}`)
            .set('Cookie', cookie)
            .expect(204);
        await request(app.getHttpServer())
            .delete(`${url()}/${transactionId}`)
            .set('Cookie', cookie)
            .expect(404);
        expect(await balance()).toBe(100000);
        const list = await request(app.getHttpServer())
            .get(url())
            .set('Cookie', cookie)
            .expect(200);
        expect(list.body).toEqual([]);
    });

    it('DELETE account removes its transactions with it', async () => {
        await request(app.getHttpServer())
            .post(url())
            .set('Cookie', cookie)
            .send(body('expense', 1000))
            .expect(201);
        await request(app.getHttpServer())
            .delete(`/api/households/${householdId}/accounts/${accountId}`)
            .set('Cookie', cookie)
            .expect(204);
        const list = await request(app.getHttpServer())
            .get(url())
            .set('Cookie', cookie)
            .expect(200);
        expect(list.body).toEqual([]);
        await request(app.getHttpServer())
            .delete(`/api/households/${householdId}/accounts/${accountId}`)
            .set('Cookie', cookie)
            .expect(404);
    });
});
