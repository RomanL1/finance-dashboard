import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { DEMO_USERS } from '../demo-users';
import { DemoLoginService } from '../services/demo-login.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
    let signIn: ReturnType<typeof vi.fn>;
    let resendVerification: ReturnType<typeof vi.fn>;
    let demoAvailable: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.spyOn>;
    const reset = signal<string | undefined>(undefined);

    beforeEach(() => {
        reset.set(undefined);
        signIn = vi.fn().mockResolvedValue(undefined);
        resendVerification = vi.fn().mockResolvedValue(undefined);
        demoAvailable = vi.fn().mockResolvedValue(false);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                {
                    provide: AuthService,
                    useValue: { signIn, resendVerification },
                },
                {
                    provide: DemoLoginService,
                    useValue: { available: demoAvailable },
                },
            ],
        });
        navigate = vi
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
    });

    async function create() {
        const fixture = TestBed.createComponent(LoginPage, {
            bindings: [inputBinding('reset', reset)],
        });
        await fixture.whenStable();
        fixture.detectChanges();
        return {
            fixture,
            page: fixture.componentInstance,
            el: fixture.nativeElement as HTMLElement,
        };
    }

    it('signs in and goes home', async () => {
        const { page } = await create();

        await page.onLogin({ email: 'a@b.c', password: 'secret' });

        expect(signIn).toHaveBeenCalledWith('a@b.c', 'secret');
        expect(navigate).toHaveBeenCalledWith(['/']);
        expect(page.error()).toBeNull();
        expect(page.busy()).toBe(false);
    });

    it('shows the translated message for the error code and stays put', async () => {
        signIn.mockRejectedValue(new AuthError('INVALID_EMAIL_OR_PASSWORD'));
        const { page } = await create();

        await page.onLogin({ email: 'a@b.c', password: 'x' });

        expect(page.error()).toBe('auth.errors.INVALID_EMAIL_OR_PASSWORD');
        expect(page.unverifiedEmail()).toBeNull();
        expect(navigate).not.toHaveBeenCalled();
        expect(page.busy()).toBe(false);
    });

    it('falls back to a generic message for anything else', async () => {
        signIn.mockRejectedValue('offline');
        const { page } = await create();

        await page.onLogin({ email: 'a@b.c', password: 'x' });

        expect(page.error()).toBe('auth.errors.UNKNOWN');
    });

    it('offers a new confirmation link for an unverified email', async () => {
        signIn.mockRejectedValue(new AuthError('EMAIL_NOT_VERIFIED'));
        const { page } = await create();

        await page.onLogin({ email: 'a@b.c', password: 'x' });
        expect(page.unverifiedEmail()).toBe('a@b.c');

        await page.resendVerification('a@b.c');

        expect(resendVerification).toHaveBeenCalledWith('a@b.c');
        expect(navigate).toHaveBeenCalledWith(['/check-email'], {
            queryParams: { email: 'a@b.c' },
        });
    });

    it('hides the demo buttons unless the backend seeded the demo users', async () => {
        const { page, el } = await create();

        expect(page.demoUsers()).toEqual([]);
        expect(el.querySelector('app-demo-login')).toBeNull();
    });

    it('signs in as a demo user with one click', async () => {
        demoAvailable.mockResolvedValue(true);
        const { page, el } = await create();

        expect(el.querySelector('app-demo-login')).not.toBeNull();
        await page.onDemoLogin(DEMO_USERS[1]!);

        expect(signIn).toHaveBeenCalledWith(
            DEMO_USERS[1]!.email,
            DEMO_USERS[1]!.password,
        );
        expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('confirms a finished password reset', async () => {
        reset.set('done');
        const { el } = await create();

        expect(el.querySelector('[role="status"]')!.textContent).toContain(
            'auth.login.passwordChanged',
        );
    });

    it('links to sign-up and forgot password', async () => {
        const { el } = await create();

        const hrefs = [...el.querySelectorAll('a')].map((a) =>
            a.getAttribute('href'),
        );
        expect(hrefs).toEqual(['/forgot-password', '/signup']);
    });
});
