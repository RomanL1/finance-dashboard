import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '../db/db.js';
import * as schema from '../db/schema.js';
import { env } from '../config/env.js';

export const auth = betterAuth({
    secret: env.auth.secret,
    baseURL: env.auth.baseUrl,
    basePath: '/api/auth',
    trustedOrigins: env.auth.trustedOrigins,
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: true },
});

export type Auth = typeof auth;
export type AuthSession = Auth['$Infer']['Session'];
export type SessionUser = AuthSession['user'];
