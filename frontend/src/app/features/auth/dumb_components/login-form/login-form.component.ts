import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    MatError,
    MatFormField,
    MatLabel,
    MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import {
    ButtonComponent,
    IconButtonComponent,
} from '../../../../components/button/button.component';
import type { LoginCredentials } from '../../auth.types';

@Component({
    selector: 'app-login-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatError,
        MatIcon,
        MatSuffix,
        ButtonComponent,
        IconButtonComponent,
    ],
    template: `
        <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-col gap-4"
            [attr.aria-describedby]="errorMessage() ? 'login-error' : null"
        >
            <mat-form-field class="flex flex-col gap-1">
                <mat-label>E-Mail</mat-label>
                <input
                    matInput
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                />
                @if (form.controls.email.hasError('required')) {
                    <mat-error>E-Mail ist erforderlich</mat-error>
                } @else if (form.controls.email.hasError('email')) {
                    <mat-error
                        >Bitte eine gültige E-Mail-Adresse eingeben</mat-error
                    >
                }
            </mat-form-field>

            <mat-form-field class="flex flex-col gap-1">
                <mat-label>Passwort eingeben</mat-label>
                <input
                    matInput
                    [type]="hide() ? 'password' : 'text'"
                    formControlName="password"
                    autocomplete="current-password"
                />
                <app-icon-button
                    matSuffix
                    (clicked)="togglePasswordVisibility($event)"
                    [ariaLabel]="
                        hide() ? 'Passwort anzeigen' : 'Passwort verbergen'
                    "
                    [ariaPressed]="!hide()"
                >
                    <mat-icon>{{
                        hide() ? 'visibility_off' : 'visibility'
                    }}</mat-icon>
                </app-icon-button>
                @if (form.controls.password.hasError('required')) {
                    <mat-error>Passwort ist erforderlich</mat-error>
                }
            </mat-form-field>

            @if (errorMessage()) {
                <p id="login-error" role="alert" class="text-red-700">
                    {{ errorMessage() }}
                </p>
            }

            <app-button
                type="submit"
                variant="filled"
                [disabled]="form.invalid || busy()"
            >
                Login
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<LoginCredentials>();

    readonly hide = signal(true);

    readonly form = new FormGroup({
        email: new FormControl('demo@finance.local', {
            nonNullable: true,
            validators: [Validators.required, Validators.email],
        }),
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        this.submitted.emit(this.form.getRawValue());
    }

    togglePasswordVisibility(event: MouseEvent): void {
        this.hide.set(!this.hide());
        event.stopPropagation();
    }
}
