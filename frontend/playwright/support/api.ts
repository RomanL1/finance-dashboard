import type { APIRequestContext } from '@playwright/test';

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

/** Signs up through the proxy; the session cookie lands in the request's context (shared with its page). */
export async function signUp(
    request: APIRequestContext,
    user: TestUser,
): Promise<void> {
    const res = await request.post('/api/auth/sign-up/email', { data: user });
    if (!res.ok()) {
        throw new Error(`sign-up failed: ${res.status()} ${await res.text()}`);
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
