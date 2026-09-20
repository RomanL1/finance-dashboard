import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

/** Stats are summed in the household currency over a half-open range; future entries inside the range count. */
describe('transaction stats (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let checkingId: string;
    let savingsId: string;

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
                        type: 'checking',
                        initialValue: 0,
                        startDate: '2026-01-01',
                    },
                    {
                        description: 'Savings',
                        currency: 'CHF',
                        type: 'checking',
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
        checkingId = accounts.body.find(
            (a: { description: string }) => a.description === 'Checking',
        ).id;
        savingsId = accounts.body.find(
            (a: { description: string }) => a.description === 'Savings',
        ).id;

        await add(checkingId, 'income', 5000, '2026-09-01T00:00:00.000Z'); // on `from`: counted
        await add(checkingId, 'expense', 1200, '2026-09-15T12:00:00.000Z');
        await add(checkingId, 'expense', 800, '2099-09-28T12:00:00.000Z'); // far future, outside
        await add(checkingId, 'expense', 300, '2026-09-29T12:00:00.000Z'); // future within month
        await add(checkingId, 'income', 999, '2026-10-01T00:00:00.000Z'); // on `to`: excluded
        await add(savingsId, 'expense', 1250, '2026-09-10T12:00:00.000Z'); // other account, same household
    });

    afterAll(() => app?.close());

    it('sums inside [from, to) in the base currency', async () => {
        const res = await stats(
            '2026-09-01T00:00:00.000Z',
            '2026-10-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual({
            currency: 'CHF',
            income: 5000,
            expenses: 2750,
            net: 2250,
        });
    });

    it('returns zeros when nothing falls in the range', async () => {
        const res = await stats(
            '2020-01-01T00:00:00.000Z',
            '2020-02-01T00:00:00.000Z',
        ).expect(200);
        expect(res.body).toEqual({
            currency: 'CHF',
            income: 0,
            expenses: 0,
            net: 0,
        });
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
