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

/** Email only; emits the address the reset link goes to. */
@Component({
    selector: 'app-forgot-password-form',
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
            [attr.aria-describedby]="errorMessage() ? 'forgot-error' : null"
        >
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

            @if (errorMessage()) {
                <p
                    id="forgot-error"
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
                {{ 'auth.forgotPassword.submit' | translate }}
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordFormComponent {
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<string>();

    readonly form = new FormGroup({
        email: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.email],
        }),
    });

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        this.submitted.emit(this.form.controls.email.value);
    }
}
