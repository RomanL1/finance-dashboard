import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { ResetPasswordPage } from './reset-password.page';

describe('ResetPasswordPage', () => {
    let resetPassword: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.spyOn>;
    const token = signal<string | undefined>('tok');

    beforeEach(() => {
        token.set('tok');
        resetPassword = vi.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: AuthService, useValue: { resetPassword } },
            ],
        });
        navigate = vi
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
    });

    function create() {
        const fixture = TestBed.createComponent(ResetPasswordPage, {
            bindings: [inputBinding('token', token)],
        });
        fixture.detectChanges();
        return {
            page: fixture.componentInstance,
            el: fixture.nativeElement as HTMLElement,
        };
    }

    it('saves the password and sends the user to login with a notice', async () => {
        const { page } = create();

        await page.onSubmit('new-password');

        expect(resetPassword).toHaveBeenCalledWith('tok', 'new-password');
        expect(navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { reset: 'done' },
        });
    });

    it('shows an invalid token and stays put', async () => {
        resetPassword.mockRejectedValue(new AuthError('INVALID_TOKEN'));
        const { page } = create();

        await page.onSubmit('new-password');

        expect(page.error()).toBe('auth.errors.INVALID_TOKEN');
        expect(navigate).not.toHaveBeenCalled();
        expect(page.busy()).toBe(false);
    });

    it('shows no form without a token', () => {
        token.set(undefined);
        const { el } = create();

        expect(el.querySelector('app-reset-password-form')).toBeNull();
        expect(el.querySelector('[role="alert"]')!.textContent).toContain(
            'auth.errors.INVALID_TOKEN',
        );
    });
});
