import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

/** The wizard checks each step before the single final submit; nothing is written until then. */
describe('onboarding steps (e2e)', () => {
    let app: INestApplication;
    let cookie: string;

    const server = () => request(app.getHttpServer());
    const validate = (step: string, body: object) =>
        server()
            .post(`/api/households/onboarding/validate-${step}`)
            .set('Cookie', cookie)
            .send(body);
    const account = {
        description: 'Checking',
        currency: 'CHF',
        type: 'checking',
        initialValue: 100000,
        startDate: '2026-01-01',
    };

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
        cookie = signIn.headers['set-cookie'][0].split(';')[0];
    });

    afterAll(() => app?.close());

    it('rejects anonymous step checks with 401', async () => {
        await server()
            .post('/api/households/onboarding/validate-household')
            .send({ name: 'Home' })
            .expect(401);
    });

    it('offers the default categories', async () => {
        const res = await server()
            .get('/api/categories/default')
            .set('Cookie', cookie)
            .expect(200);

        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body).toContainEqual({ translateKey: 'MISC' });
    });

    describe('household step', () => {
        it('accepts a name', async () => {
            await validate('household', { name: 'Home' }).expect(204);
        });

        it.each([{}, { name: '' }, { name: '   ' }, { name: 'x'.repeat(101) }])(
            'rejects %j with 400',
            async (body) => {
                await validate('household', body).expect(400);
            },
        );
    });

    describe('categories step', () => {
        it('accepts distinct names', async () => {
            await validate('categories', {
                categoryNames: ['Groceries', 'Housing'],
            }).expect(204);
        });

        it.each([
            ['names that only differ by case', ['Groceries', 'groceries']],
            ['an empty list', []],
            ['a blank name', ['Groceries', '']],
        ])('rejects %s with 400', async (_case, categoryNames) => {
            await validate('categories', { categoryNames }).expect(400);
        });
    });

    describe('accounts step', () => {
        it('accepts a valid account', async () => {
            await validate('accounts', { accounts: [account] }).expect(204);
        });

        it.each([
            ['no accounts', []],
            ['a blank description', [{ ...account, description: ' ' }]],
            ['an unknown type', [{ ...account, type: 'crypto' }]],
            ['an unsupported currency', [{ ...account, currency: 'JPY' }]],
            ['a missing start date', [{ ...account, startDate: undefined }]],
        ])('rejects %s with 400', async (_case, accounts) => {
            await validate('accounts', { accounts }).expect(400);
        });
    });

    it('step checks write nothing: the user still has no household', async () => {
        await server()
            .get('/api/households/me')
            .set('Cookie', cookie)
            .expect(404);
    });

    it('the final submit creates the household with its categories and accounts', async () => {
        const res = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({
                name: 'Home',
                categoryNames: ['Groceries'],
                accounts: [account],
            })
            .expect(201);
        expect(res.body).toMatchObject({
            name: 'Home',
            role: 'owner',
            onboardingComplete: true,
            baseCurrency: 'CHF',
        });

        const me = await server()
            .get('/api/households/me')
            .set('Cookie', cookie)
            .expect(200);
        expect(me.body.id).toBe(res.body.id);
    });

    it('refuses a second onboarding with 409', async () => {
        await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({ name: 'Again', categoryNames: ['X'], accounts: [account] })
            .expect(409);
    });
});
