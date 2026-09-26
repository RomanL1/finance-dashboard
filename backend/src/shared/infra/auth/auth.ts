import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '../db/db.js';
import * as schema from '../db/schema.js';
import { env } from '../config/env.js';
import { authMail, mailLanguage } from '../mail/auth-mails.js';
import { sendMail } from '../mail/mailer.js';

/** Frontend routes that receive the tokens from the mails (see frontend paths.config.ts). */
const AUTH_LINKS = {
    verifyEmail: '/verify-email',
    resetPassword: '/reset-password',
    forgotPassword: '/forgot-password',
} as const;

function appLink(path: string, token?: string): string {
    const url = new URL(path, env.appUrl);
    if (token) url.searchParams.set('token', token);
    return url.toString();
}

export const auth = betterAuth({
    secret: env.auth.secret,
    baseURL: env.auth.baseUrl,
    basePath: '/api/auth',
    trustedOrigins: env.auth.trustedOrigins,
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: {
        enabled: true,
        // Also makes sign-up answer the same way for new and existing emails (no account enumeration).
        requireEmailVerification: true,
        // Frontend validators mirror these (features/auth/auth.types.ts).
        minPasswordLength: 8,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        // Links go to frontend pages, which call the API with the token: better-auth's own URLs
        // would redirect through the backend origin.
        sendResetPassword: ({ user, token }, request) =>
            sendMail(
                authMail({
                    kind: 'resetPassword',
                    language: mailLanguage(request),
                    to: user.email,
                    name: user.name,
                    url: appLink(AUTH_LINKS.resetPassword, token),
                }),
            ),
        // Sign-up with a taken email looks successful to the caller; the owner gets told instead.
        onExistingUserSignUp: ({ user }, request) =>
            sendMail(
                authMail({
                    kind: 'existingAccount',
                    language: mailLanguage(request),
                    to: user.email,
                    name: user.name,
                    url: appLink(AUTH_LINKS.forgotPassword),
                }),
            ),
    },
    emailVerification: {
        expiresIn: 24 * 60 * 60,
        autoSignInAfterVerification: true,
        sendVerificationEmail: ({ user, token }, request) =>
            sendMail(
                authMail({
                    kind: 'verifyEmail',
                    language: mailLanguage(request),
                    to: user.email,
                    name: user.name,
                    url: appLink(AUTH_LINKS.verifyEmail, token),
                }),
            ),
    },
    // Rate limiting keys on the client IP. The compose nginx overwrites X-Real-IP with $remote_addr;
    // X-Forwarded-For is client-controlled and would allow bypassing the limit by rotating it.
    // better-auth's defaults already cap sign-in/sign-up (3 per 10 s) and reset/verification mails (3 per min).
    advanced: {
        ipAddress: { ipAddressHeaders: ['x-real-ip'] },
    },
});

export type Auth = typeof auth;
export type AuthSession = Auth['$Infer']['Session'];
export type SessionUser = AuthSession['user'];

/** The one thing request guards need from better-auth; lets specs pass a plain fake. */
export interface SessionLookup {
    api: {
        getSession(options: { headers: Headers }): Promise<AuthSession | null>;
    };
}
