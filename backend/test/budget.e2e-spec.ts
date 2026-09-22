import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { MAX_AMOUNT } from '../src/shared/kernel/index.js';
import { prepareTestDb } from './setup-db.js';

describe('budget (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let categoryId: string;

    const month = '2026-09';

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await app.init();
    });

    afterAll(() => app?.close());

    const server = () => request(app.getHttpServer());
    const base = () => `/api/households/${householdId}/budgets`;

    it('rejects anonymous access with 401', async () => {
        await server()
            .get('/api/households/x/budgets?month=2026-09')
            .expect(401);
    });

    it('signs in and onboards the demo user', async () => {
        const signIn = await server()
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        cookie = signIn.headers['set-cookie'][0].split(';')[0];

        const onboarding = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({
                name: 'Demo Haushalt',
                categoryNames: ['Groceries'],
                accounts: [
                    {
                        description: 'Checking',
                        currency: 'CHF',
                        type: 'checking',
                        initialValue: 100000,
                        startDate: '2026-01-01',
                    },
                ],
            })
            .expect(201);
        householdId = onboarding.body.id;

        const categories = await server()
            .get(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .expect(200);
        categoryId = categories.body[0].id;
    });

    it('GET returns an empty list for a month without limits', async () => {
        const res = await server()
            .get(`${base()}?month=${month}`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body).toEqual([]);
    });

    it('GET rejects a malformed month with 400', async () => {
        await server()
            .get(`${base()}?month=2026-9`)
            .set('Cookie', cookie)
            .expect(400);
    });

    it('GET returns 403 for a household the user is not a member of', async () => {
        await server()
            .get('/api/households/other-household/budgets?month=2026-09')
            .set('Cookie', cookie)
            .expect(403);
    });

    it('PUT creates a limit', async () => {
        const res = await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: 50000 })
            .expect(200);
        expect(res.body).toMatchObject({ categoryId, month, amount: 50000 });
        expect(res.body.id).toBeDefined();
    });

    it('PUT replaces the amount of an existing limit, keeping one row', async () => {
        await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: 0 })
            .expect(200);

        const res = await server()
            .get(`${base()}?month=${month}`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({ categoryId, month, amount: 0 });
    });

    it('PUT rejects a negative or fractional amount with 400', async () => {
        await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: -1 })
            .expect(400);
        await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: 10.5 })
            .expect(400);
    });

    it('PUT accepts an amount at the cap and rejects one above', async () => {
        await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: MAX_AMOUNT })
            .expect(200);
        await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: MAX_AMOUNT + 1 })
            .expect(400);
    });

    it('PUT rejects a malformed month with 400', async () => {
        await server()
            .put(`${base()}/${categoryId}/2026-13`)
            .set('Cookie', cookie)
            .send({ amount: 100 })
            .expect(400);
    });

    it('PUT returns 404 for a category outside the household', async () => {
        await server()
            .put(`${base()}/unknown-category/${month}`)
            .set('Cookie', cookie)
            .send({ amount: 100 })
            .expect(404);
    });

    it('DELETE removes the limit with 204, then 404 on repeat', async () => {
        await server()
            .delete(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .expect(204);
        await server()
            .delete(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .expect(404);

        const res = await server()
            .get(`${base()}?month=${month}`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body).toEqual([]);
    });

    it('POST copy-previous fills an empty month from the nearest earlier month with limits', async () => {
        await server()
            .put(`${base()}/${categoryId}/2026-06`)
            .set('Cookie', cookie)
            .send({ amount: 30000 })
            .expect(200);

        const res = await server()
            .post(`${base()}/2026-08/copy-previous`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body.sourceMonth).toBe('2026-06');
        expect(res.body.budgets).toHaveLength(1);
        expect(res.body.budgets[0]).toMatchObject({
            categoryId,
            month: '2026-08',
            amount: 30000,
        });

        const list = await server()
            .get(`${base()}?month=2026-08`)
            .set('Cookie', cookie)
            .expect(200);
        expect(list.body).toHaveLength(1);
    });

    it('editing the copied month leaves the source month untouched', async () => {
        await server()
            .put(`${base()}/${categoryId}/2026-08`)
            .set('Cookie', cookie)
            .send({ amount: 1 })
            .expect(200);

        const june = await server()
            .get(`${base()}?month=2026-06`)
            .set('Cookie', cookie)
            .expect(200);
        expect(june.body[0]).toMatchObject({ amount: 30000 });
    });

    it('POST copy-previous returns 409 when the month already has limits', async () => {
        await server()
            .post(`${base()}/2026-08/copy-previous`)
            .set('Cookie', cookie)
            .expect(409);
    });

    it('POST copy-previous returns no source when nothing earlier exists', async () => {
        const res = await server()
            .post(`${base()}/2026-01/copy-previous`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body).toEqual({
            sourceMonth: null,
            budgets: [],
            skipped: false,
        });
    });

    it('a month emptied on purpose stays empty for the automatic take-over, not the explicit one', async () => {
        await server()
            .delete(`${base()}/${categoryId}/2026-08`)
            .set('Cookie', cookie)
            .expect(204);

        const auto = await server()
            .post(`${base()}/2026-08/copy-previous?auto=true`)
            .set('Cookie', cookie)
            .expect(200);
        expect(auto.body).toEqual({
            sourceMonth: null,
            budgets: [],
            skipped: true,
        });
        const list = await server()
            .get(`${base()}?month=2026-08`)
            .set('Cookie', cookie)
            .expect(200);
        expect(list.body).toEqual([]);

        const explicit = await server()
            .post(`${base()}/2026-08/copy-previous`)
            .set('Cookie', cookie)
            .expect(200);
        expect(explicit.body.sourceMonth).toBe('2026-06');
    });

    it('the automatic take-over fills a month nobody touched', async () => {
        const res = await server()
            .post(`${base()}/2026-11/copy-previous?auto=true`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body.skipped).toBe(false);
        expect(res.body.budgets).toHaveLength(1);
    });

    it('full loop: auto-fill, empty, stays empty, explicit refill, empty again, stays empty', async () => {
        const loopMonth = '2026-12';
        const auto = () =>
            server()
                .post(`${base()}/${loopMonth}/copy-previous?auto=true`)
                .set('Cookie', cookie)
                .expect(200);
        const removeAll = async (budgets: { categoryId: string }[]) => {
            for (const b of budgets) {
                await server()
                    .delete(`${base()}/${b.categoryId}/${loopMonth}`)
                    .set('Cookie', cookie)
                    .expect(204);
            }
        };
        const list = () =>
            server()
                .get(`${base()}?month=${loopMonth}`)
                .set('Cookie', cookie)
                .expect(200);

        // 1. first view fills the month
        const first = await auto();
        expect(first.body.budgets.length).toBeGreaterThan(0);

        // 2.-3. delete all, reload: stays empty
        await removeAll(first.body.budgets);
        expect((await auto()).body.skipped).toBe(true);
        expect((await list()).body).toEqual([]);

        // 4. explicit take-over brings the limits back
        const explicit = await server()
            .post(`${base()}/${loopMonth}/copy-previous`)
            .set('Cookie', cookie)
            .expect(200);
        expect(explicit.body.budgets.length).toBeGreaterThan(0);

        // 5. delete again, reload: still empty
        await removeAll(explicit.body.budgets);
        expect((await auto()).body.skipped).toBe(true);
        expect((await list()).body).toEqual([]);
    });

    it('POST copy-previous rejects a malformed month with 400', async () => {
        await server()
            .post(`${base()}/2026-13/copy-previous`)
            .set('Cookie', cookie)
            .expect(400);
    });

    it('deleting the category removes its limits', async () => {
        await server()
            .put(`${base()}/${categoryId}/${month}`)
            .set('Cookie', cookie)
            .send({ amount: 100 })
            .expect(200);
        await server()
            .delete(`/api/households/${householdId}/categories/${categoryId}`)
            .set('Cookie', cookie)
            .expect(204);

        const res = await server()
            .get(`${base()}?month=${month}`)
            .set('Cookie', cookie)
            .expect(200);
        expect(res.body).toEqual([]);
    });
});
