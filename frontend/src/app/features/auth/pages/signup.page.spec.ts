import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthError, AuthService } from '../../../core/auth/auth.service';
import { SignupPage } from './signup.page';

describe('SignupPage', () => {
    let signUp: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.spyOn>;
    const data = { name: 'Ann', email: 'ann@b.c', password: 'password1' };

    beforeEach(() => {
        signUp = vi.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: AuthService, useValue: { signUp } },
            ],
        });
        navigate = vi
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
    });

    function create(): SignupPage {
        const fixture = TestBed.createComponent(SignupPage);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('signs up and asks the user to check their email', async () => {
        const page = create();

        await page.onSignUp(data);

        expect(signUp).toHaveBeenCalledWith('Ann', 'ann@b.c', 'password1');
        expect(navigate).toHaveBeenCalledWith(['/check-email'], {
            queryParams: { email: 'ann@b.c' },
        });
        expect(page.busy()).toBe(false);
    });

    it('shows the translated error and stays put', async () => {
        signUp.mockRejectedValue(new AuthError('TOO_MANY_REQUESTS'));
        const page = create();

        await page.onSignUp(data);

        expect(page.error()).toBe('auth.errors.TOO_MANY_REQUESTS');
        expect(navigate).not.toHaveBeenCalled();
        expect(page.busy()).toBe(false);
    });
});
