import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { DEMO_USER } from '../src/shared/infra/db/seed.js';
import { prepareTestDb } from './setup-db.js';
import { listenOnLoopback } from './setup-app.js';
import { sessionCookie, signUpVerified } from './support/auth.js';
import { lastMailTo, mailsTo, tokenFrom } from './support/mail.js';

describe('auth + household (e2e)', () => {
    let app: INestApplication;
    let cookie: string;
    const server = () => request(app.getHttpServer());
    const signUp = (email: string, language = 'en') =>
        server()
            .post('/api/auth/sign-up/email')
            .set('Accept-Language', language)
            .send({ email, password: 'new-password', name: 'New <b>User</b>' });
    const signIn = (email: string, password: string) =>
        server().post('/api/auth/sign-in/email').send({ email, password });

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = setupApp(moduleRef.createNestApplication());
        await listenOnLoopback(app);
    });

    afterAll(() => app?.close());

    it('rejects anonymous access', async () => {
        await server().get('/api/households/me').expect(401);
    });

    it('signs in the seeded demo user (created verified, without a mail)', async () => {
        const res = await signIn(DEMO_USER.email, DEMO_USER.password).expect(
            200,
        );
        expect(res.body.user.email).toBe(DEMO_USER.email);
        expect(res.body.user.emailVerified).toBe(true);
        expect(await mailsTo(DEMO_USER.email)).toEqual([]);
        cookie = sessionCookie(res);
    });

    it('GET /api/households/me returns 404 for the seeded demo user (no household yet)', async () => {
        await server()
            .get('/api/households/me')
            .set('Cookie', cookie)
            .expect(404);
    });

    describe('sign-up with email verification', () => {
        const email = 'new@finance.local';

        it('creates the user without a session and mails a link to the frontend', async () => {
            const res = await signUp(email).expect(200);
            expect(res.body.token).toBeNull();
            expect(res.headers['set-cookie']).toBeUndefined();

            const mail = await lastMailTo(email);
            expect(mail.subject).toBe('Confirm your email address');
            expect(mail.text).toContain(
                'http://localhost:4200/verify-email?token=',
            );
        });

        it('escapes the user-supplied name in the HTML body', async () => {
            const mail = await lastMailTo(email);
            expect(mail.html).toContain('New &lt;b&gt;User&lt;/b&gt;');
            expect(mail.html).not.toContain('<b>User</b>');
        });

        it('refuses to sign in until the email is verified', async () => {
            const res = await signIn(email, 'new-password').expect(403);
            expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
        });

        it('resends the verification mail on request', async () => {
            const before = (await mailsTo(email)).length;
            await server()
                .post('/api/auth/send-verification-email')
                .send({ email })
                .expect(200);
            expect(await mailsTo(email)).toHaveLength(before + 1);
        });

        it('rejects an invalid token', async () => {
            const res = await server()
                .get('/api/auth/verify-email')
                .query({ token: 'not-a-token' })
                .expect(401);
            expect(res.body.code).toBe('INVALID_TOKEN');
        });

        it('verifies with the mailed token and signs the user in', async () => {
            const token = tokenFrom(await lastMailTo(email));
            const res = await server()
                .get('/api/auth/verify-email')
                .query({ token })
                .expect(200);
            await server()
                .get('/api/households/me')
                .set('Cookie', sessionCookie(res))
                .expect(404);
            await signIn(email, 'new-password').expect(200);
        });

        it('answers a sign-up with a taken email like a new one and tells the owner by mail', async () => {
            const res = await signUp(email).expect(200);
            expect(res.body.token).toBeNull();
            const mail = await lastMailTo(email);
            expect(mail.subject).toBe('You already have an account');
            expect(mail.text).toContain(
                'http://localhost:4200/forgot-password',
            );
        });

        it('writes the mail in the language the frontend sends', async () => {
            await signUp('neu@finance.local', 'de').expect(200);
            const mail = await lastMailTo('neu@finance.local');
            expect(mail.subject).toBe('Bestätige deine E-Mail-Adresse');
            expect(mail.html).toContain('<html lang="de">');
        });

        it('rejects a password shorter than 8 characters', async () => {
            const res = await server()
                .post('/api/auth/sign-up/email')
                .send({
                    email: 'short@finance.local',
                    password: '1234567',
                    name: 'Short',
                })
                .expect(400);
            expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
        });
    });

    describe('password reset', () => {
        const user = {
            email: 'reset@finance.local',
            password: 'old-password',
            name: 'Reset',
        };
        let oldSession: string;

        beforeAll(async () => {
            oldSession = await signUpVerified(app, user);
        });

        it('answers the same for unknown emails and sends nothing', async () => {
            await server()
                .post('/api/auth/request-password-reset')
                .send({ email: 'nobody@finance.local' })
                .expect(200);
            expect(await mailsTo('nobody@finance.local')).toEqual([]);
        });

        it('resets the password with the mailed token and ends existing sessions', async () => {
            await server()
                .post('/api/auth/request-password-reset')
                .send({ email: user.email })
                .expect(200);
            const mail = await lastMailTo(user.email);
            expect(mail.subject).toBe('Reset your password');
            expect(mail.text).toContain(
                'http://localhost:4200/reset-password?token=',
            );

            await server()
                .post('/api/auth/reset-password')
                .send({ token: tokenFrom(mail), newPassword: 'new-password' })
                .expect(200);

            await signIn(user.email, 'old-password').expect(401);
            await signIn(user.email, 'new-password').expect(200);
            await server()
                .get('/api/households/me')
                .set('Cookie', oldSession)
                .expect(401);
        });

        it('rejects a reused token', async () => {
            const token = tokenFrom(await lastMailTo(user.email));
            const res = await server()
                .post('/api/auth/reset-password')
                .send({ token, newPassword: 'another-password' })
                .expect(400);
            expect(res.body.code).toBe('INVALID_TOKEN');
        });
    });

    it('GET /api/config is public and offers demo login outside production', async () => {
        const res = await server().get('/api/config').expect(200);
        expect(res.body).toEqual({ demoLogin: true });
    });
});
