import { Component, inject, signal } from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
    MatFormField,
    MatLabel,
    MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';

@Component({
    selector: 'app-login-page',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatIcon,
        MatIconButton,
        MatSuffix,
        MatButton,
    ],
    template: `
        <main class="mx-auto mt-16 max-w-sm p-4">
            <h1 class="mb-6 text-2xl font-semibold">Login</h1>
            <form
                [formGroup]="form"
                (ngSubmit)="submit()"
                class="flex flex-col gap-4"
                aria-describedby="login-error"
            >
                <mat-form-field class="flex flex-col gap-1">
                    <mat-label>E-Mail</mat-label>
                    <input
                        matInput
                        type="text"
                        formControlName="email"
                        autocomplete="email"
                    />
                </mat-form-field>

                <mat-form-field class="flex flex-col gap-1">
                    <mat-label>Enter your password</mat-label>
                    <input
                        matInput
                        [type]="hide() ? 'password' : 'text'"
                        formControlName="password"
                        autocomplete="current-password"
                    />
                    <button
                        type="button"
                        matIconButton
                        matSuffix
                        (click)="clickEvent($event)"
                        [attr.aria-label]="'Hide password'"
                        [attr.aria-pressed]="hide()"
                    >
                        <mat-icon
                            >{{ hide() ? 'visibility_off' : 'visibility' }}
                        </mat-icon>
                    </button>
                </mat-form-field>

                @if (error()) {
                    <p id="login-error" role="alert" class="text-red-700">
                        {{ error() }}
                    </p>
                }
                <button
                    type="submit"
                    [disabled]="form.invalid || busy()"
                    matButton="filled"
                >
                    Login
                </button>
            </form>
            <p class="mt-4 text-sm text-slate-600">
                Demo: demo&#64;finance.local / demo-password
            </p>
        </main>
    `,
})
export class LoginPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    readonly hide = signal(true);

    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
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

    async submit(): Promise<void> {
        if (this.form.invalid) return;
        this.busy.set(true);
        this.error.set(null);
        try {
            const { email, password } = this.form.getRawValue();
            await this.auth.signIn(email, password);
            await this.router.navigate(['/']);
        } catch (e) {
            this.error.set(
                e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen',
            );
        } finally {
            this.busy.set(false);
        }
    }

    clickEvent(event: MouseEvent) {
        this.hide.set(!this.hide());
        event.stopPropagation();
    }
}
