import type { AuthSession } from '../../src/shared/infra/auth/auth.js';

/** A complete better-auth session, so specs never have to cast a partial one. */
export function makeSession(userId = 'u1'): AuthSession {
    const at = new Date('2026-01-01T00:00:00.000Z');
    return {
        user: {
            id: userId,
            email: `${userId}@finance.local`,
            emailVerified: true,
            name: userId,
            createdAt: at,
            updatedAt: at,
        },
        session: {
            id: `session-${userId}`,
            token: `token-${userId}`,
            userId,
            expiresAt: new Date('2099-01-01T00:00:00.000Z'),
            createdAt: at,
            updatedAt: at,
        },
    };
}
