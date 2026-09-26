import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { lastMailTo, tokenFrom } from './mail.js';

export interface NewUser {
    email: string;
    password: string;
    name: string;
}

export function sessionCookie(res: request.Response): string {
    const cookies = res.headers['set-cookie'] as unknown as string[];
    return cookies[0]!.split(';')[0]!;
}

/** Sign-up needs a verified email before a session exists: follow the mailed link like a user would. */
export async function signUpVerified(
    app: INestApplication,
    user: NewUser,
): Promise<string> {
    await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send(user)
        .expect(200);
    const token = tokenFrom(await lastMailTo(user.email));
    const verified = await request(app.getHttpServer())
        .get('/api/auth/verify-email')
        .query({ token })
        .expect(200);
    return sessionCookie(verified);
}
