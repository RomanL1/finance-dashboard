import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

/** Stats are per currency over a half-open range; future entries inside the range count. */
describe('transaction stats (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let chfAccountId: string;
    let eurAccountId: string;

    const stats = (from: string, to: string) =>
        request(app.getHttpServer())
            .get(`/api/households/${householdId}/transactions/stats`)
            .query({ from, to })
            .set('Cookie', cookie);
    const add = (
        accountId: string,
        type: 'expense' | 'income',
        amount: number,
        date: string,
    ) =>
        request(app.getHttpServer())
            .post(`/api/households/${householdId}/transactions`)
            .set('Cookie', cookie)
            .send({ accountId, type, amount, title: 'x', date })
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

        await add(chfAccountId, 'income', 5000, '2026-09-01T00:00:00.000Z'); // on `from`: counted
        await add(chfAccountId, 'expense', 1200, '2026-09-15T12:00:00.000Z');
        await add(chfAccountId, 'expense', 800, '2099-09-28T12:00:00.000Z'); // far future, outside
        await add(chfAccountId, 'expense', 300, '2026-09-29T12:00:00.000Z'); // future within month
        await add(chfAccountId, 'income', 999, '2026-10-01T00:00:00.000Z'); // on `to`: excluded
        await add(eurAccountId, 'expense', 2500, '2026-09-10T12:00:00.000Z');
    });

    afterAll(() => app?.close());

    it('sums per currency inside [from, to)', async () => {
        const res = await stats(
            '2026-09-01T00:00:00.000Z',
            '2026-10-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual([
            { currency: 'CHF', income: 5000, expenses: 1500, net: 3500 },
            { currency: 'EUR', income: 0, expenses: 2500, net: -2500 },
        ]);
    });

    it('returns an empty list when nothing falls in the range', async () => {
        const res = await stats(
            '2020-01-01T00:00:00.000Z',
            '2020-02-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual([]);
    });

    it('rejects an inverted range with 400', async () => {
        await stats(
            '2026-10-01T00:00:00.000Z',
            '2026-09-01T00:00:00.000Z',
        ).expect(400);
    });

    it('rejects a malformed date with 400', async () => {
        await stats('not-a-date', '2026-09-01T00:00:00.000Z').expect(400);
    });
});
