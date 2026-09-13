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
 * Category stats convert every currency into the household base currency at the day's rate.
 * The provider is unreachable here (see vitest.config.e2e.ts), so rates come from the mirror.
 */
describe('category stats (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let chfAccountId: string;
    let eurAccountId: string;
    let utilitiesId: string;

    const stats = (from: string, to: string) =>
        request(app.getHttpServer())
            .get(`/api/households/${householdId}/transactions/stats/categories`)
            .query({ from, to })
            .set('Cookie', cookie);
    const add = (
        accountId: string,
        amount: number,
        date: string,
        categoryId: string | null = null,
    ) =>
        request(app.getHttpServer())
            .post(`/api/households/${householdId}/transactions`)
            .set('Cookie', cookie)
            .send({ accountId, type: 'expense', amount, categoryId, date })
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
                        initialValue: 0,
                        startDate: '2026-01-01',
                    },
                    {
                        description: 'Travel',
                        currency: 'EUR',
                        initialValue: 0,
                        startDate: '2026-01-01',
                    },
                ],
            })
            .expect(201);
        householdId = onboarding.body.id;
        expect(onboarding.body.baseCurrency).toBe('CHF');

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
        const categories = await request(app.getHttpServer())
            .get(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .expect(200);
        utilitiesId = categories.body[0].id;

        await add(chfAccountId, 1000, '2026-09-01T12:00:00.000Z', utilitiesId);
        await add(eurAccountId, 2000, '2026-09-02T12:00:00.000Z', utilitiesId); // 1 CHF = 2 EUR → 1000
        await add(eurAccountId, 4000, '2026-09-20T12:00:00.000Z'); // 1 CHF = 4 EUR → 1000, uncategorized
        await add(chfAccountId, 300, '2026-08-31T23:59:59.000Z', utilitiesId); // before range
    });

    afterAll(() => app?.close());

    it('answers 503 when a conversion is needed, nothing is mirrored and the provider is down', async () => {
        await stats(
            '2026-09-01T00:00:00.000Z',
            '2026-10-01T00:00:00.000Z',
        ).expect(503);
    });

    it("converts at each day's rate into the base currency, merged per category", async () => {
        await db.insert(exchangeRate).values([
            { base: 'CHF', quote: 'EUR', date: '2026-08-30', rate: 2 },
            { base: 'CHF', quote: 'EUR', date: '2026-09-05', rate: 4 },
        ]);
        const res = await stats(
            '2026-09-01T00:00:00.000Z',
            '2026-10-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual({
            currency: 'CHF',
            categories: [
                {
                    categoryId: utilitiesId,
                    categoryName: 'Utilities',
                    expenses: 2000,
                },
                { categoryId: null, categoryName: null, expenses: 1000 },
            ],
        });
    });

    it('returns no categories when nothing falls in the range', async () => {
        const res = await stats(
            '2020-01-01T00:00:00.000Z',
            '2020-02-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual({ currency: 'CHF', categories: [] });
    });

    it('follows a changed base currency', async () => {
        await db
            .insert(exchangeRate)
            .values([
                { base: 'EUR', quote: 'CHF', date: '2026-08-30', rate: 0.5 },
            ]);
        await request(app.getHttpServer())
            .patch(`/api/households/${householdId}`)
            .set('Cookie', cookie)
            .send({ baseCurrency: 'EUR' })
            .expect(200)
            .expect((r) => expect(r.body.baseCurrency).toBe('EUR'));

        const res = await stats(
            '2026-09-01T00:00:00.000Z',
            '2026-10-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual({
            currency: 'EUR',
            // Tie on 4000: named category first, uncategorized last.
            categories: [
                {
                    categoryId: utilitiesId,
                    categoryName: 'Utilities',
                    expenses: 4000,
                },
                { categoryId: null, categoryName: null, expenses: 4000 },
            ],
        });
    });

    it('rejects an unsupported base currency with 400', async () => {
        await request(app.getHttpServer())
            .patch(`/api/households/${householdId}`)
            .set('Cookie', cookie)
            .send({ baseCurrency: 'XXX' })
            .expect(400);
    });
});
