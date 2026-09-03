import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';

describe('auth + household (e2e)', () => {
    let app: INestApplication;
    let cookie: string;

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await app.init();
    });

    afterAll(() => app?.close());

    it('rejects anonymous access', async () => {
        await request(app.getHttpServer())
            .get('/api/households/me')
            .expect(401);
    });

    it('signs in the seeded demo user', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/sign-in/email')
            .send({ email: DEMO_USER.email, password: DEMO_USER.password })
            .expect(200);
        expect(res.body.user.email).toBe(DEMO_USER.email);
        cookie = res.headers['set-cookie'][0].split(';')[0];
    });

    it('GET /api/households/me returns 404 for the seeded demo user (no household yet)', async () => {
        await request(app.getHttpServer())
            .get('/api/households/me')
            .set('Cookie', cookie)
            .expect(404);
    });

    it('a fresh user without household gets 404', async () => {
        const signUp = await request(app.getHttpServer())
            .post('/api/auth/sign-up/email')
            .send({
                email: 'new@finance.local',
                password: 'new-password',
                name: 'New',
            })
            .expect(200);
        const newCookie = signUp.headers['set-cookie'][0].split(';')[0];
        await request(app.getHttpServer())
            .get('/api/households/me')
            .set('Cookie', newCookie)
            .expect(404);
    });
});
