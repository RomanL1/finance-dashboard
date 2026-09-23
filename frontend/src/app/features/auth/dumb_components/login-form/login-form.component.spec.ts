import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { LoginCredentials } from '../../auth.types';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
    const busy = signal(false);
    const errorMessage = signal<string | null>(null);

    function create() {
        const fixture = TestBed.createComponent(LoginFormComponent, {
            bindings: [
                inputBinding('busy', busy),
                inputBinding('errorMessage', errorMessage),
            ],
        });
        fixture.detectChanges();
        const emitted: LoginCredentials[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        const el = fixture.nativeElement as HTMLElement;
        return { fixture, form: fixture.componentInstance, emitted, el };
    }

    beforeEach(() => {
        busy.set(false);
        errorMessage.set(null);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('needs a password before it submits', () => {
        const { form, emitted } = create();

        form.submit();
        expect(emitted).toEqual([]);

        form.form.controls.password.setValue('secret');
        form.submit();
        expect(emitted).toEqual([
            { email: 'demo@finance.local', password: 'secret' },
        ]);
    });

    it('rejects a malformed email', () => {
        const { form, emitted } = create();

        form.form.setValue({ email: 'not-an-email', password: 'secret' });
        form.submit();

        expect(form.form.controls.email.hasError('email')).toBe(true);
        expect(emitted).toEqual([]);
    });

    it('does not submit while busy', () => {
        busy.set(true);
        const { form, emitted } = create();

        form.form.controls.password.setValue('secret');
        form.submit();

        expect(emitted).toEqual([]);
    });

    it('toggles password visibility without submitting', () => {
        const { fixture, form, emitted, el } = create();
        const password = () =>
            el.querySelector<HTMLInputElement>(
                'input[formControlName="password"]',
            )!;
        const toggle = el.querySelector<HTMLButtonElement>(
            'app-icon-button button',
        )!;
        form.form.controls.password.setValue('secret');
        expect(password().type).toBe('password');
        expect(toggle.getAttribute('aria-pressed')).toBe('false');

        toggle.click();
        fixture.detectChanges();

        expect(password().type).toBe('text');
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        expect(emitted).toEqual([]);
    });

    it('links the error message to the form', () => {
        errorMessage.set('Invalid email or password');
        const { el } = create();

        expect(el.querySelector('form')!.getAttribute('aria-describedby')).toBe(
            'login-error',
        );
        expect(el.querySelector('#login-error')!.textContent).toContain(
            'Invalid email or password',
        );
    });
});
