import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';
import { listenOnLoopback } from './setup-app.js';

/** History list: filters by account and category (incl. uncategorized), newest first, paged. */
describe('transaction list (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let checking: string;
    let savings: string;
    let food: string;

    const server = () => request(app.getHttpServer());
    const list = (query = '') =>
        server()
            .get(`/api/households/${householdId}/transactions${query}`)
            .set('Cookie', cookie);
    const titles = (body: { items: { title: string }[] }) =>
        body.items.map((t) => t.title);

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

        const account = (description: string) => ({
            description,
            currency: 'CHF',
            type: 'checking',
            initialValue: 0,
            startDate: '2026-01-01',
        });
        const onboarding = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({
                name: 'Demo Haushalt',
                categoryNames: ['Food'],
                accounts: [account('Checking'), account('Savings')],
            })
            .expect(201);
        householdId = onboarding.body.id;

        const accounts = await server()
            .get(`/api/households/${householdId}/accounts`)
            .set('Cookie', cookie)
            .expect(200);
        checking = accounts.body.find(
            (a: { description: string }) => a.description === 'Checking',
        ).id;
        savings = accounts.body.find(
            (a: { description: string }) => a.description === 'Savings',
        ).id;
        const categories = await server()
            .get(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .expect(200);
        food = categories.body[0].id;

        // Posted out of order on purpose: the list must sort by date, not by insertion.
        const rows = [
            ['t2', checking, food, '2026-02-02'],
            ['t4', savings, food, '2026-02-04'],
            ['t1', checking, null, '2026-02-01'],
            ['t5', checking, null, '2026-02-05'],
            ['t3', savings, null, '2026-02-03'],
        ] as const;
        for (const [title, accountId, categoryId, day] of rows) {
            await server()
                .post(`/api/households/${householdId}/transactions`)
                .set('Cookie', cookie)
                .send({
                    accountId,
                    categoryId,
                    type: 'expense',
                    amount: 100,
                    title,
                    date: `${day}T12:00:00.000Z`,
                })
                .expect(201);
        }
    });

    afterAll(() => app?.close());

    it('lists every row newest first on page one by default', async () => {
        const res = await list().expect(200);

        expect(titles(res.body)).toEqual(['t5', 't4', 't3', 't2', 't1']);
        expect(res.body).toMatchObject({ total: 5, page: 1, pageSize: 50 });
    });

    it('filters by account', async () => {
        const res = await list(`?accountId=${savings}`).expect(200);

        expect(titles(res.body)).toEqual(['t4', 't3']);
        expect(res.body.total).toBe(2);
    });

    it('filters by category', async () => {
        const res = await list(`?categoryId=${food}`).expect(200);

        expect(titles(res.body)).toEqual(['t4', 't2']);
    });

    it('reads categoryId=none as uncategorized', async () => {
        const res = await list('?categoryId=none').expect(200);

        expect(titles(res.body)).toEqual(['t5', 't3', 't1']);
        expect(res.body.total).toBe(3);
    });

    it('combines account and category filters', async () => {
        const res = await list(`?accountId=${checking}&categoryId=none`).expect(
            200,
        );

        expect(titles(res.body)).toEqual(['t5', 't1']);
    });

    it('pages with the total across all pages', async () => {
        const second = await list('?page=2&pageSize=2').expect(200);
        const last = await list('?page=3&pageSize=2').expect(200);

        expect(titles(second.body)).toEqual(['t3', 't2']);
        expect(second.body).toMatchObject({ total: 5, page: 2, pageSize: 2 });
        expect(titles(last.body)).toEqual(['t1']);
    });

    it('returns an empty page past the end, not an error', async () => {
        const res = await list('?page=9&pageSize=2').expect(200);

        expect(res.body.items).toEqual([]);
        expect(res.body.total).toBe(5);
    });

    it('matches nothing for an unknown account', async () => {
        const res = await list('?accountId=unknown').expect(200);

        expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it.each(['?page=0', '?page=abc', '?pageSize=0', '?pageSize=101'])(
        'rejects %s with 400',
        async (query) => {
            await list(query).expect(400);
        },
    );
});
