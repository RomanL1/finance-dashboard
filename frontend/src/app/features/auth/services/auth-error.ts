import { AuthError } from '../../../core/auth/auth.service';

/** better-auth codes the auth pages have their own message for (`auth.errors.<code>`). */
const KNOWN_CODES = new Set([
    'INVALID_EMAIL_OR_PASSWORD',
    'EMAIL_NOT_VERIFIED',
    'INVALID_EMAIL',
    'PASSWORD_TOO_SHORT',
    'PASSWORD_TOO_LONG',
    'INVALID_TOKEN',
    'TOKEN_EXPIRED',
    'TOO_MANY_REQUESTS',
]);

/** Translation key for any failure of an auth call, including network errors. */
export function authErrorKey(error: unknown): string {
    const code =
        error instanceof AuthError && KNOWN_CODES.has(error.code)
            ? error.code
            : 'UNKNOWN';
    return `auth.errors.${code}`;
}
