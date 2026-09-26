import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { GuestGuard } from './guest.guard';

describe('GuestGuard', () => {
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

    it('loads the session once and lets anonymous users in', async () => {
        await expect(TestBed.inject(GuestGuard).canActivate()).resolves.toBe(
            true,
        );
        expect(refresh).toHaveBeenCalledOnce();
    });

    it('sends signed-in users home without reloading a known session', async () => {
        ready.set(true);
        isAuthenticated.set(true);

        const result = await TestBed.inject(GuestGuard).canActivate();

        expect(refresh).not.toHaveBeenCalled();
        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
            '/',
        );
    });
});
