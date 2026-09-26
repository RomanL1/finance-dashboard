import type {
    AbstractControl,
    FormGroupDirective,
    NgForm,
    ValidationErrors,
    ValidatorFn,
} from '@angular/forms';
import type { ErrorStateMatcher } from '@angular/material/core';

/** Group validator over `password` and `confirmPassword`. */
export const passwordsMatch: ValidatorFn = (
    group: AbstractControl,
): ValidationErrors | null => {
    const password = group.get('password')?.value as string | undefined;
    const confirm = group.get('confirmPassword')?.value as string | undefined;
    return !confirm || password === confirm ? null : { passwordMismatch: true };
};

/** Shows the group's mismatch on the confirm field once the user has touched it. */
export class ConfirmPasswordErrorMatcher implements ErrorStateMatcher {
    isErrorState(
        control: AbstractControl | null,
        form: FormGroupDirective | NgForm | null,
    ): boolean {
        const touched = !!control?.touched || !!form?.submitted;
        const mismatch = !!control?.parent?.hasError('passwordMismatch');
        return touched && (!!control?.invalid || mismatch);
    }
}
