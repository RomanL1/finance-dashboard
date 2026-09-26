import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { VerifyEmailPage } from './verify-email.page';

describe('VerifyEmailPage', () => {
    let verifyEmail: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.spyOn>;
    const token = signal<string | undefined>('tok');

    beforeEach(() => {
        token.set('tok');
        verifyEmail = vi.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: AuthService, useValue: { verifyEmail } },
            ],
        });
        navigate = vi
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
    });

    async function create(): Promise<VerifyEmailPage> {
        const fixture = TestBed.createComponent(VerifyEmailPage, {
            bindings: [inputBinding('token', token)],
        });
        fixture.detectChanges();
        await fixture.whenStable();
        return fixture.componentInstance;
    }

    it('verifies the token and goes home (guards lead on to onboarding)', async () => {
        const page = await create();

        expect(verifyEmail).toHaveBeenCalledWith('tok');
        expect(navigate).toHaveBeenCalledWith(['/']);
        expect(page.errorKey()).toBeNull();
    });

    it('explains an expired link', async () => {
        verifyEmail.mockRejectedValue(new AuthError('TOKEN_EXPIRED'));
        const page = await create();

        expect(page.errorKey()).toBe('auth.errors.TOKEN_EXPIRED');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('treats a missing token as invalid without calling the API', async () => {
        token.set(undefined);
        const page = await create();

        expect(verifyEmail).not.toHaveBeenCalled();
        expect(page.errorKey()).toBe('auth.errors.INVALID_TOKEN');
    });
});
