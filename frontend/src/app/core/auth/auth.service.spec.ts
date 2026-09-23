import { TestBed } from '@angular/core/testing';
import { AUTH_CLIENT } from './auth-client';
import { AuthService } from './auth.service';

const user = { id: 'u1', email: 'demo@finance.local', name: 'Demo' };

describe('AuthService', () => {
    let client: {
        getSession: ReturnType<typeof vi.fn>;
        signIn: { email: ReturnType<typeof vi.fn> };
        signOut: ReturnType<typeof vi.fn>;
    };
    let service: AuthService;

    beforeEach(() => {
        client = {
            getSession: vi.fn().mockResolvedValue({ data: { user } }),
            signIn: { email: vi.fn().mockResolvedValue({ error: null }) },
            signOut: vi.fn().mockResolvedValue({}),
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

    it('signIn rejects with the server message and stays anonymous', async () => {
        client.signIn.email.mockResolvedValue({
            error: { message: 'Invalid email or password' },
        });

        await expect(service.signIn('demo@finance.local', 'x')).rejects.toThrow(
            'Invalid email or password',
        );
        expect(client.getSession).not.toHaveBeenCalled();
        expect(service.isAuthenticated()).toBe(false);
    });

    it('signIn falls back to a generic message', async () => {
        client.signIn.email.mockResolvedValue({ error: {} });

        await expect(service.signIn('a@b.c', 'x')).rejects.toThrow(
            'Sign-in failed',
        );
    });

    it('signOut forgets the user', async () => {
        await service.refresh();

        await service.signOut();

        expect(client.signOut).toHaveBeenCalledOnce();
        expect(service.user()).toBeNull();
        expect(service.isAuthenticated()).toBe(false);
    });
});
