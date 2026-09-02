import { createAuthClient } from 'better-auth/client';

/** better-auth client against the backend's /api/auth endpoints. Cookies carry the session. */
export const authClient = createAuthClient({
    baseURL: 'http://localhost:3000',
    basePath: '/api/auth',
    fetchOptions: { credentials: 'include' },
});

export type Session = typeof authClient.$Infer.Session;
export type SessionUser = Session['user'];
