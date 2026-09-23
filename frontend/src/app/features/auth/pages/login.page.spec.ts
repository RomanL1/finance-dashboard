import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
    let signIn: ReturnType<typeof vi.fn>;
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        signIn = vi.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: AuthService, useValue: { signIn } },
            ],
        });
        navigate = vi
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
    });

    function create(): LoginPage {
        const fixture = TestBed.createComponent(LoginPage);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('signs in and goes home', async () => {
        const page = create();

        await page.onLogin({ email: 'a@b.c', password: 'secret' });

        expect(signIn).toHaveBeenCalledWith('a@b.c', 'secret');
        expect(navigate).toHaveBeenCalledWith(['/']);
        expect(page.error()).toBeNull();
        expect(page.busy()).toBe(false);
    });

    it('shows the server message and stays put', async () => {
        signIn.mockRejectedValue(new Error('Invalid email or password'));
        const page = create();

        await page.onLogin({ email: 'a@b.c', password: 'x' });

        expect(page.error()).toBe('Invalid email or password');
        expect(navigate).not.toHaveBeenCalled();
        expect(page.busy()).toBe(false);
    });

    it('falls back to a generic message for anything else', async () => {
        signIn.mockRejectedValue('offline');
        const page = create();

        await page.onLogin({ email: 'a@b.c', password: 'x' });

        expect(page.error()).toBe('auth.login.failed');
    });
});
