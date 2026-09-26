import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { SignUpData } from '../../auth.types';
import { SignupFormComponent } from './signup-form.component';

describe('SignupFormComponent', () => {
    const busy = signal(false);
    const errorMessage = signal<string | null>(null);

    function create() {
        const fixture = TestBed.createComponent(SignupFormComponent, {
            bindings: [
                inputBinding('busy', busy),
                inputBinding('errorMessage', errorMessage),
            ],
        });
        fixture.detectChanges();
        const emitted: SignUpData[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        const el = fixture.nativeElement as HTMLElement;
        return { fixture, form: fixture.componentInstance, emitted, el };
    }

    const valid = {
        name: '  Ann  ',
        email: 'ann@finance.local',
        password: 'password1',
        confirmPassword: 'password1',
    };

    beforeEach(() => {
        busy.set(false);
        errorMessage.set(null);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('emits trimmed name, email and password', () => {
        const { form, emitted } = create();

        form.form.setValue(valid);
        form.submit();

        expect(emitted).toEqual([
            { name: 'Ann', email: 'ann@finance.local', password: 'password1' },
        ]);
    });

    it.each([
        ['name', { name: '' }],
        ['email', { email: 'not-an-email' }],
        ['short password', { password: '1234567', confirmPassword: '1234567' }],
        [
            'long password',
            { password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) },
        ],
        ['mismatching confirmation', { confirmPassword: 'password2' }],
    ])('does not submit with an invalid %s', (_, change) => {
        const { form, emitted } = create();

        form.form.setValue({ ...valid, ...change });
        form.submit();

        expect(emitted).toEqual([]);
    });

    it('shows the mismatch on the confirmation field', () => {
        const { fixture, form, el } = create();

        form.form.setValue({ ...valid, confirmPassword: 'password2' });
        form.form.controls.confirmPassword.markAsTouched();
        fixture.detectChanges();

        expect(el.querySelector('mat-error')!.textContent).toContain(
            'auth.fields.passwordMismatch',
        );
    });

    it('does not submit while busy', () => {
        busy.set(true);
        const { form, emitted } = create();

        form.form.setValue(valid);
        form.submit();

        expect(emitted).toEqual([]);
    });

    it('links the error message to the form', () => {
        errorMessage.set('Too many attempts');
        const { el } = create();

        expect(el.querySelector('form')!.getAttribute('aria-describedby')).toBe(
            'signup-error',
        );
        expect(el.querySelector('#signup-error')!.textContent).toContain(
            'Too many attempts',
        );
    });
});
