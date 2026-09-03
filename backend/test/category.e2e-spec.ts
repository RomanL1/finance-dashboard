import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

describe('category (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    let householdId: string;
    let createdCategoryId: string;

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await app.init();
    });

    afterAll(() => app?.close());

    it('rejects anonymous access with 401', async () => {
        await request(app.getHttpServer())
            .get('/api/households/placeholder-household-id/categories')
            .expect(401);
    });

    it('signs in the demo user', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        expect(res.body.user.email).toBe(DEMO_USER.email);
        cookie = res.headers['set-cookie'][0].split(';')[0];
    });

    it('creates a household for the demo user', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/households')
            .set('Cookie', cookie)
            .send({ name: 'Demo Haushalt', currency: 'CHF' })
            .expect(201);
        householdId = res.body.id;
    });

    it('GET categories succeeds for household member', async () => {
        const res = await request(app.getHttpServer())
            .get(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET categories returns 403 when user is not member of household', async () => {
        await request(app.getHttpServer())
            .get('/api/households/other-household-id/categories')
            .set('Cookie', cookie)
            .expect(403);
    });

    it('POST creates a category', async () => {
        const res = await request(app.getHttpServer())
            .post(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .send({ name: 'Groceries' })
            .expect(201);

        expect(res.body).toMatchObject({ name: 'Groceries' });
        expect(res.body.id).toBeDefined();
        expect(res.body.createdAt).toBeDefined();
        createdCategoryId = res.body.id;
    });

    it('POST rejects empty or whitespace name with 400', async () => {
        await request(app.getHttpServer())
            .post(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .send({ name: '   ' })
            .expect(400);
    });

    it('POST rejects duplicate category name in the same household with 409', async () => {
        await request(app.getHttpServer())
            .post(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .send({ name: 'Groceries' })
            .expect(409);
    });

    it('PATCH renames the category', async () => {
        const res = await request(app.getHttpServer())
            .patch(
                `/api/households/${householdId}/categories/${createdCategoryId}`,
            )
            .set('Cookie', cookie)
            .send({ name: 'Supermarket' })
            .expect(200);

        expect(res.body.name).toBe('Supermarket');
    });

    it('PATCH rejects empty name with 400', async () => {
        await request(app.getHttpServer())
            .patch(
                `/api/households/${householdId}/categories/${createdCategoryId}`,
            )
            .set('Cookie', cookie)
            .send({ name: '' })
            .expect(400);
    });

    it('PATCH returns 404 for non-existent category', async () => {
        await request(app.getHttpServer())
            .patch(`/api/households/${householdId}/categories/non-existent-id`)
            .set('Cookie', cookie)
            .send({ name: 'Anything' })
            .expect(404);
    });

    it('DELETE deletes category with 204', async () => {
        await request(app.getHttpServer())
            .delete(
                `/api/households/${householdId}/categories/${createdCategoryId}`,
            )
            .set('Cookie', cookie)
            .expect(204);

        const res = await request(app.getHttpServer())
            .get(`/api/households/${householdId}/categories`)
            .set('Cookie', cookie)
            .expect(200);

        expect(
            res.body.some(
                (cat: { id: string }) => cat.id === createdCategoryId,
            ),
        ).toBe(false);
    });

    it('DELETE returns 404 for non-existent category', async () => {
        await request(app.getHttpServer())
            .delete(`/api/households/${householdId}/categories/non-existent-id`)
            .set('Cookie', cookie)
            .expect(404);
    });
});
