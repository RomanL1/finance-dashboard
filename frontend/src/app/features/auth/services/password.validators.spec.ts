import { FormControl, FormGroup, FormGroupDirective } from '@angular/forms';
import {
    ConfirmPasswordErrorMatcher,
    passwordsMatch,
} from './password.validators';

function group(password: string, confirmPassword: string) {
    return new FormGroup(
        {
            password: new FormControl(password),
            confirmPassword: new FormControl(confirmPassword),
        },
        { validators: passwordsMatch },
    );
}

describe('passwordsMatch', () => {
    it('accepts equal passwords and an empty confirmation', () => {
        expect(group('secret-1', 'secret-1').valid).toBe(true);
        expect(group('secret-1', '').hasError('passwordMismatch')).toBe(false);
    });

    it('flags different passwords on the group', () => {
        expect(group('secret-1', 'secret-2').hasError('passwordMismatch')).toBe(
            true,
        );
    });
});

describe('ConfirmPasswordErrorMatcher', () => {
    const matcher = new ConfirmPasswordErrorMatcher();

    it('shows the mismatch only once the confirmation was touched', () => {
        const form = group('secret-1', 'secret-2');
        const confirm = form.controls.confirmPassword;

        expect(matcher.isErrorState(confirm, null)).toBe(false);
        confirm.markAsTouched();
        expect(matcher.isErrorState(confirm, null)).toBe(true);
    });

    it('shows it after a submit attempt even when untouched', () => {
        const form = group('secret-1', 'secret-2');
        const submitted = { submitted: true } as FormGroupDirective;

        expect(
            matcher.isErrorState(form.controls.confirmPassword, submitted),
        ).toBe(true);
    });

    it('stays quiet for matching passwords', () => {
        const form = group('secret-1', 'secret-1');
        form.controls.confirmPassword.markAsTouched();

        expect(matcher.isErrorState(form.controls.confirmPassword, null)).toBe(
            false,
        );
    });
});
