import { AuthError } from '../../../core/auth/auth.service';
import { authErrorKey } from './auth-error';

describe('authErrorKey', () => {
    it('maps known better-auth codes to their own message', () => {
        expect(authErrorKey(new AuthError('EMAIL_NOT_VERIFIED'))).toBe(
            'auth.errors.EMAIL_NOT_VERIFIED',
        );
        expect(authErrorKey(new AuthError('TOO_MANY_REQUESTS'))).toBe(
            'auth.errors.TOO_MANY_REQUESTS',
        );
    });

    it('uses the generic message for unknown codes and non-auth failures', () => {
        expect(authErrorKey(new AuthError('SOMETHING_NEW'))).toBe(
            'auth.errors.UNKNOWN',
        );
        expect(authErrorKey(new TypeError('Failed to fetch'))).toBe(
            'auth.errors.UNKNOWN',
        );
    });
});
