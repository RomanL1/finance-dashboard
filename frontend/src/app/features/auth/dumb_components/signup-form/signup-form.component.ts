import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import { PASSWORD_LENGTH, type SignUpData } from '../../auth.types';
import {
    ConfirmPasswordErrorMatcher,
    passwordsMatch,
} from '../../services/password.validators';

@Component({
    selector: 'app-signup-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatError,
        ButtonComponent,
        TranslatePipe,
    ],
    template: `
        <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-col gap-4"
            [attr.aria-describedby]="errorMessage() ? 'signup-error' : null"
        >
            <mat-form-field>
                <mat-label>{{ 'auth.fields.name' | translate }}</mat-label>
                <input matInput formControlName="name" autocomplete="name" />
                @if (form.controls.name.hasError('required')) {
                    <mat-error>{{
                        'auth.fields.nameRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{ 'auth.fields.email' | translate }}</mat-label>
                <input
                    matInput
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                />
                @if (form.controls.email.hasError('required')) {
                    <mat-error>{{
                        'auth.fields.emailRequired' | translate
                    }}</mat-error>
                } @else if (form.controls.email.hasError('email')) {
                    <mat-error>{{
                        'auth.fields.emailInvalid' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{ 'auth.fields.password' | translate }}</mat-label>
                <input
                    matInput
                    type="password"
                    formControlName="password"
                    autocomplete="new-password"
                />
                @if (form.controls.password.hasError('required')) {
                    <mat-error>{{
                        'auth.fields.passwordRequired' | translate
                    }}</mat-error>
                } @else if (form.controls.password.hasError('minlength')) {
                    <mat-error>{{
                        'auth.fields.passwordTooShort'
                            | translate: { min: passwordLength.min }
                    }}</mat-error>
                } @else if (form.controls.password.hasError('maxlength')) {
                    <mat-error>{{
                        'auth.fields.passwordTooLong'
                            | translate: { max: passwordLength.max }
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{
                    'auth.fields.confirmPassword' | translate
                }}</mat-label>
                <input
                    matInput
                    type="password"
                    formControlName="confirmPassword"
                    autocomplete="new-password"
                    [errorStateMatcher]="confirmMatcher"
                />
                @if (form.controls.confirmPassword.hasError('required')) {
                    <mat-error>{{
                        'auth.fields.confirmPasswordRequired' | translate
                    }}</mat-error>
                } @else if (form.hasError('passwordMismatch')) {
                    <mat-error>{{
                        'auth.fields.passwordMismatch' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            @if (errorMessage()) {
                <p
                    id="signup-error"
                    role="alert"
                    class="type-body-medium text-error"
                >
                    {{ errorMessage() }}
                </p>
            }

            <app-button
                type="submit"
                variant="filled"
                [disabled]="form.invalid || busy()"
            >
                {{ 'auth.signup.submit' | translate }}
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupFormComponent {
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<SignUpData>();

    readonly passwordLength = PASSWORD_LENGTH;
    readonly confirmMatcher = new ConfirmPasswordErrorMatcher();

    readonly form = new FormGroup(
        {
            name: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required],
            }),
            email: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required, Validators.email],
            }),
            password: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.minLength(PASSWORD_LENGTH.min),
                    Validators.maxLength(PASSWORD_LENGTH.max),
                ],
            }),
            confirmPassword: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required],
            }),
        },
        { validators: passwordsMatch },
    );

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        const { name, email, password } = this.form.getRawValue();
        this.submitted.emit({ name: name.trim(), email, password });
    }
}
