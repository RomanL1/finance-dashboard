import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { CheckEmailPage } from './check-email.page';

describe('CheckEmailPage', () => {
    let resendVerification: ReturnType<typeof vi.fn>;
    const email = signal<string | undefined>('ann@b.c');

    beforeEach(() => {
        email.set('ann@b.c');
        resendVerification = vi.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: AuthService, useValue: { resendVerification } },
            ],
        });
    });

    function create() {
        const fixture = TestBed.createComponent(CheckEmailPage, {
            bindings: [inputBinding('email', email)],
        });
        fixture.detectChanges();
        return {
            page: fixture.componentInstance,
            el: fixture.nativeElement as HTMLElement,
        };
    }

    it('resends the link and confirms it', async () => {
        const { page } = create();

        await page.resend('ann@b.c');

        expect(resendVerification).toHaveBeenCalledWith('ann@b.c');
        expect(page.resent()).toBe(true);
        expect(page.error()).toBeNull();
    });

    it('shows a rate-limit error instead of the confirmation', async () => {
        resendVerification.mockRejectedValue(
            new AuthError('TOO_MANY_REQUESTS'),
        );
        const { page } = create();

        await page.resend('ann@b.c');

        expect(page.resent()).toBe(false);
        expect(page.error()).toBe('auth.errors.TOO_MANY_REQUESTS');
    });

    it('has no resend button without an email', () => {
        email.set(undefined);
        const { el } = create();

        expect(el.querySelector('app-button')).toBeNull();
    });
});
