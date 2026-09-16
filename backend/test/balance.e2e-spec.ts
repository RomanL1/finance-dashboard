import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { db } from '../src/shared/infra/db/db.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { exchangeRate } from '../src/shared/infra/db/schema.js';
import { prepareTestDb } from './setup-db.js';

/**
 * The household balance sums active accounts at the newest mirrored rate.
 * The provider is unreachable here (see vitest.config.e2e.ts): rates are seeded into the mirror.
 */
describe('household balance (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let chfAccountId: string;
    let eurAccountId: string;

    const balance = () =>
        request(app.getHttpServer())
            .get(`/api/households/${householdId}/balance`)
            .set('Cookie', cookie);
    const add = (
        accountId: string,
        type: 'expense' | 'income',
        amount: number,
    ) =>
        request(app.getHttpServer())
            .post(`/api/households/${householdId}/transactions`)
            .set('Cookie', cookie)
            .send({
                accountId,
                type,
                amount,
                title: 'x',
                date: '2026-09-01T00:00:00.000Z',
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
                        initialValue: 10000,
                        startDate: '2026-01-01',
                    },
                    {
                        description: 'Travel',
                        currency: 'EUR',
                        initialValue: 1000,
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
        chfAccountId = accounts.body.find(
            (a: { currency: string }) => a.currency === 'CHF',
        ).id;
        eurAccountId = accounts.body.find(
            (a: { currency: string }) => a.currency === 'EUR',
        ).id;
    });

    afterAll(() => app?.close());

    it('fails with 503 while no rate for a foreign-currency account is mirrored', async () => {
        await balance().expect(503);
    });

    it('sums initial values plus transactions at the newest mirrored rate', async () => {
        await db.insert(exchangeRate).values([
            { base: 'CHF', quote: 'EUR', date: '2026-01-01', rate: 4 }, // older, ignored
            { base: 'CHF', quote: 'EUR', date: '2026-09-01', rate: 2 },
        ]);
        await add(chfAccountId, 'expense', 2500); // CHF 10000 - 2500 = 7500
        await add(eurAccountId, 'income', 1000); // EUR 1000 + 1000 = 2000 → CHF 1000

        const res = await balance().expect(200);
        expect(res.body).toEqual({ currency: 'CHF', amount: 8500 });
    });

    it('leaves archived accounts out', async () => {
        await request(app.getHttpServer())
            .patch(`/api/households/${householdId}/accounts/${eurAccountId}`)
            .set('Cookie', cookie)
            .send({
                description: 'Travel',
                currency: 'EUR',
                startDate: '2026-01-01',
                archivedAt: '2026-09-02T00:00:00.000Z',
            })
            .expect(200);

        const res = await balance().expect(200);
        expect(res.body).toEqual({ currency: 'CHF', amount: 7500 });
    });
});
