import { InjectionToken } from '@angular/core';
import { createAuthClient } from 'better-auth/client';

/** better-auth client against the backend's /api/auth endpoints. Cookies carry the session.
 *  Relative baseURL: dev-server proxy.conf.json forwards /api to the backend. */
export const authClient = createAuthClient({
    baseURL: '',
    basePath: '/api/auth',
    fetchOptions: { credentials: 'include' },
});

export type Session = typeof authClient.$Infer.Session;
export type SessionUser = Session['user'];

export type AuthClient = typeof authClient;

/** Lets specs swap the client: better-fetch binds `fetch` at creation, so it cannot be stubbed per test. */
export const AUTH_CLIENT = new InjectionToken<AuthClient>('AUTH_CLIENT', {
    providedIn: 'root',
    factory: () => authClient,
});
