import type { APIRequestContext } from '@playwright/test';
import { lastMailLink } from './mail';

export interface TestUser {
    email: string;
    password: string;
    name: string;
}

/** Unique per call, so parallel tests never share a household. */
export function newUser(): TestUser {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
        email: `e2e-${id}@finance.local`,
        password: 'e2e-password',
        name: `E2E ${id}`,
    };
}

/**
 * Signs up and opens the mailed verification link through the proxy, like the user would.
 * Verifying starts the session; its cookie lands in the request's context (shared with its page).
 */
export async function signUp(
    request: APIRequestContext,
    user: TestUser,
): Promise<void> {
    const res = await request.post('/api/auth/sign-up/email', { data: user });
    if (!res.ok()) {
        throw new Error(`sign-up failed: ${res.status()} ${await res.text()}`);
    }
    const token = new URL(lastMailLink(user.email)).searchParams.get('token');
    const verified = await request.get('/api/auth/verify-email', {
        params: { token: token ?? '' },
    });
    if (!verified.ok()) {
        throw new Error(
            `verification failed: ${verified.status()} ${await verified.text()}`,
        );
    }
}

/** Skips the onboarding UI: one household, one category, one CHF account. */
export async function onboard(
    request: APIRequestContext,
    householdName: string,
): Promise<void> {
    const res = await request.post('/api/households/onboarding', {
        data: {
            name: householdName,
            categoryNames: ['Groceries'],
            accounts: [
                {
                    description: 'Main account',
                    type: 'checking',
                    currency: 'CHF',
                    initialValue: 100_000,
                    startDate: new Date().toISOString().slice(0, 10),
                },
            ],
        },
    });
    if (!res.ok()) {
        throw new Error(
            `onboarding failed: ${res.status()} ${await res.text()}`,
        );
    }
}
