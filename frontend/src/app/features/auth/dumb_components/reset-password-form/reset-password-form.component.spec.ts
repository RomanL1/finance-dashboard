import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ResetPasswordFormComponent } from './reset-password-form.component';

describe('ResetPasswordFormComponent', () => {
    function create() {
        const fixture = TestBed.createComponent(ResetPasswordFormComponent);
        fixture.detectChanges();
        const emitted: string[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { form: fixture.componentInstance, emitted };
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('emits the new password once both fields match', () => {
        const { form, emitted } = create();

        form.form.setValue({
            password: 'password1',
            confirmPassword: 'password2',
        });
        form.submit();
        expect(emitted).toEqual([]);

        form.form.controls.confirmPassword.setValue('password1');
        form.submit();
        expect(emitted).toEqual(['password1']);
    });

    it('enforces the minimum length', () => {
        const { form, emitted } = create();

        form.form.setValue({ password: 'short', confirmPassword: 'short' });
        form.submit();

        expect(form.form.controls.password.hasError('minlength')).toBe(true);
        expect(emitted).toEqual([]);
    });
});
