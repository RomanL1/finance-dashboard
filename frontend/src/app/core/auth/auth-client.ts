import { InjectionToken } from '@angular/core';
import { createAuthClient } from 'better-auth/client';
import { restoreLanguage } from '../i18n/language.service';

/** better-auth client against the backend's /api/auth endpoints. Cookies carry the session.
 *  Relative baseURL: dev-server proxy.conf.json forwards /api to the backend.
 *  Accept-Language picks the language of the mails the backend sends; the UI language only
 *  changes with a reload, so reading it once is enough. */
export const authClient = createAuthClient({
    baseURL: '',
    basePath: '/api/auth',
    fetchOptions: {
        credentials: 'include',
        headers: { 'Accept-Language': restoreLanguage() },
    },
});

export type Session = typeof authClient.$Infer.Session;
export type SessionUser = Session['user'];

export type AuthClient = typeof authClient;

/** Lets specs swap the client: better-fetch binds `fetch` at creation, so it cannot be stubbed per test. */
export const AUTH_CLIENT = new InjectionToken<AuthClient>('AUTH_CLIENT', {
    providedIn: 'root',
    factory: () => authClient,
});
