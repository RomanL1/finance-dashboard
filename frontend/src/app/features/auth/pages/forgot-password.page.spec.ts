import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
    let requestPasswordReset: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        requestPasswordReset = vi.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: AuthService, useValue: { requestPasswordReset } },
            ],
        });
    });

    function create() {
        const fixture = TestBed.createComponent(ForgotPasswordPage);
        fixture.detectChanges();
        return { fixture, page: fixture.componentInstance };
    }

    it('requests the link and replaces the form with a neutral confirmation', async () => {
        const { fixture, page } = create();

        await page.onSubmit('ann@b.c');
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(requestPasswordReset).toHaveBeenCalledWith('ann@b.c');
        expect(page.sentTo()).toBe('ann@b.c');
        expect(el.querySelector('app-forgot-password-form')).toBeNull();
        expect(el.querySelector('[role="status"]')).not.toBeNull();
    });

    it('keeps the form and shows the error on failure', async () => {
        requestPasswordReset.mockRejectedValue(
            new AuthError('TOO_MANY_REQUESTS'),
        );
        const { page } = create();

        await page.onSubmit('ann@b.c');

        expect(page.sentTo()).toBeNull();
        expect(page.error()).toBe('auth.errors.TOO_MANY_REQUESTS');
    });
});
