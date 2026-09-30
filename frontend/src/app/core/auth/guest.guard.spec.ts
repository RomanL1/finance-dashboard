import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    convertToParamMap,
    provideRouter,
    Router,
    UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';
import { GuestGuard } from './guest.guard';

describe('GuestGuard', () => {
    const route = (queryParams: Record<string, string> = {}) =>
        ({
            queryParamMap: convertToParamMap(queryParams),
        }) as ActivatedRouteSnapshot;

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
        await expect(
            TestBed.inject(GuestGuard).canActivate(route()),
        ).resolves.toBe(true);
        expect(refresh).toHaveBeenCalledOnce();
    });

    it('sends signed-in users home without reloading a known session', async () => {
        ready.set(true);
        isAuthenticated.set(true);

        const result = await TestBed.inject(GuestGuard).canActivate(route());

        expect(refresh).not.toHaveBeenCalled();
        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
            '/',
        );
    });

    it('sends a signed-in user who came from an invitation back to it', async () => {
        ready.set(true);
        isAuthenticated.set(true);

        const result = await TestBed.inject(GuestGuard).canActivate(
            route({ invite: 'tok' }),
        );

        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
            '/invite/tok',
        );
    });

    it('lets an anonymous invitee reach the page', async () => {
        await expect(
            TestBed.inject(GuestGuard).canActivate(route({ invite: 'tok' })),
        ).resolves.toBe(true);
    });
});
