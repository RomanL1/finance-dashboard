import { TestBed } from '@angular/core/testing';
import { AUTH_CLIENT } from './auth-client';
import { AuthError, AuthService } from './auth.service';

const user = { id: 'u1', email: 'demo@finance.local', name: 'Demo' };

describe('AuthService', () => {
    let client: {
        getSession: ReturnType<typeof vi.fn>;
        signIn: { email: ReturnType<typeof vi.fn> };
        signOut: ReturnType<typeof vi.fn>;
        signUp: { email: ReturnType<typeof vi.fn> };
        sendVerificationEmail: ReturnType<typeof vi.fn>;
        verifyEmail: ReturnType<typeof vi.fn>;
        requestPasswordReset: ReturnType<typeof vi.fn>;
        resetPassword: ReturnType<typeof vi.fn>;
    };
    let service: AuthService;

    beforeEach(() => {
        client = {
            getSession: vi.fn().mockResolvedValue({ data: { user } }),
            signIn: { email: vi.fn().mockResolvedValue({ error: null }) },
            signOut: vi.fn().mockResolvedValue({}),
            signUp: { email: vi.fn().mockResolvedValue({ error: null }) },
            sendVerificationEmail: vi.fn().mockResolvedValue({ error: null }),
            verifyEmail: vi.fn().mockResolvedValue({ error: null }),
            requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
            resetPassword: vi.fn().mockResolvedValue({ error: null }),
        };
        TestBed.configureTestingModule({
            providers: [{ provide: AUTH_CLIENT, useValue: client }],
        });
        service = TestBed.inject(AuthService);
    });

    it('is anonymous and not ready before the first refresh', () => {
        expect(service.ready()).toBe(false);
        expect(service.isAuthenticated()).toBe(false);
        expect(service.user()).toBeNull();
    });

    it('refresh picks up the session user', async () => {
        await service.refresh();

        expect(service.ready()).toBe(true);
        expect(service.isAuthenticated()).toBe(true);
        expect(service.user()).toEqual(user);
    });

    it('refresh without a session is ready but anonymous', async () => {
        client.getSession.mockResolvedValue({ data: null });

        await service.refresh();

        expect(service.ready()).toBe(true);
        expect(service.isAuthenticated()).toBe(false);
    });

    it('signIn loads the session on success', async () => {
        await service.signIn('demo@finance.local', 'secret');

        expect(client.signIn.email).toHaveBeenCalledWith({
            email: 'demo@finance.local',
            password: 'secret',
        });
        expect(client.getSession).toHaveBeenCalledOnce();
        expect(service.isAuthenticated()).toBe(true);
    });

    it('signIn rejects with the better-auth code and stays anonymous', async () => {
        client.signIn.email.mockResolvedValue({
            error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 },
        });

        const error = await service
            .signIn('demo@finance.local', 'x')
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('INVALID_EMAIL_OR_PASSWORD');
        expect(client.getSession).not.toHaveBeenCalled();
        expect(service.isAuthenticated()).toBe(false);
    });

    it('reports rate limiting by status, since it comes without a code', async () => {
        client.signIn.email.mockResolvedValue({ error: { status: 429 } });

        await expect(service.signIn('a@b.c', 'x')).rejects.toMatchObject({
            code: 'TOO_MANY_REQUESTS',
        });
    });

    it('falls back to UNKNOWN for errors without a code', async () => {
        client.signIn.email.mockResolvedValue({ error: { status: 500 } });

        await expect(service.signIn('a@b.c', 'x')).rejects.toMatchObject({
            code: 'UNKNOWN',
        });
    });

    it('signUp creates the user without loading a session', async () => {
        await service.signUp('Ann', 'ann@b.c', 'password1');

        expect(client.signUp.email).toHaveBeenCalledWith({
            name: 'Ann',
            email: 'ann@b.c',
            password: 'password1',
        });
        expect(client.getSession).not.toHaveBeenCalled();
    });

    it('signUp rejects with the better-auth code', async () => {
        client.signUp.email.mockResolvedValue({
            error: { code: 'PASSWORD_TOO_SHORT', status: 400 },
        });

        await expect(
            service.signUp('Ann', 'ann@b.c', 'short'),
        ).rejects.toMatchObject({ code: 'PASSWORD_TOO_SHORT' });
    });

    it('verifyEmail sends the token and loads the new session', async () => {
        await service.verifyEmail('tok');

        expect(client.verifyEmail).toHaveBeenCalledWith({
            query: { token: 'tok' },
        });
        expect(service.isAuthenticated()).toBe(true);
    });

    it('verifyEmail rejects an invalid token without loading a session', async () => {
        client.verifyEmail.mockResolvedValue({
            error: { code: 'INVALID_TOKEN', status: 401 },
        });

        await expect(service.verifyEmail('bad')).rejects.toMatchObject({
            code: 'INVALID_TOKEN',
        });
        expect(client.getSession).not.toHaveBeenCalled();
    });

    it('passes mail and password-reset requests through', async () => {
        await service.resendVerification('ann@b.c');
        await service.requestPasswordReset('ann@b.c');
        await service.resetPassword('tok', 'new-password');

        expect(client.sendVerificationEmail).toHaveBeenCalledWith({
            email: 'ann@b.c',
        });
        expect(client.requestPasswordReset).toHaveBeenCalledWith({
            email: 'ann@b.c',
        });
        expect(client.resetPassword).toHaveBeenCalledWith({
            token: 'tok',
            newPassword: 'new-password',
        });
    });

    it('resetPassword rejects an expired token', async () => {
        client.resetPassword.mockResolvedValue({
            error: { code: 'INVALID_TOKEN', status: 400 },
        });

        await expect(
            service.resetPassword('old', 'new-password'),
        ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    });

    it('signOut forgets the user', async () => {
        await service.refresh();

        await service.signOut();

        expect(client.signOut).toHaveBeenCalledOnce();
        expect(service.user()).toBeNull();
        expect(service.isAuthenticated()).toBe(false);
    });
});
