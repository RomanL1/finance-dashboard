import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
    const ready = signal(false);
    const isAuthenticated = signal(false);
    let refresh: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        ready.set(false);
        isAuthenticated.set(false);
        refresh = vi.fn(async () => ready.set(true));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: AuthService,
                    useValue: { ready, isAuthenticated, refresh },
                },
            ],
        });
    });

    it('loads the session once before deciding', async () => {
        isAuthenticated.set(true);

        await expect(TestBed.inject(AuthGuard).canActivate()).resolves.toBe(
            true,
        );
        expect(refresh).toHaveBeenCalledOnce();
    });

    it('does not reload a session that is already known', async () => {
        ready.set(true);
        isAuthenticated.set(true);

        await TestBed.inject(AuthGuard).canActivate();

        expect(refresh).not.toHaveBeenCalled();
    });

    it('sends anonymous users to the login page', async () => {
        ready.set(true);

        const result = await TestBed.inject(AuthGuard).canActivate();

        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
            '/login',
        );
    });
});
