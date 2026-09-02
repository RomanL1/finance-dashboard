import { Component, inject, signal } from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule],
    template: `
        <main class="mx-auto mt-16 max-w-sm p-4">
            <h1 class="mb-6 text-2xl font-semibold">Anmelden</h1>
            <form
                [formGroup]="form"
                (ngSubmit)="submit()"
                class="flex flex-col gap-4"
                aria-describedby="login-error"
            >
                <label class="flex flex-col gap-1">
                    <span>E-Mail</span>
                    <input
                        type="email"
                        formControlName="email"
                        autocomplete="email"
                        class="rounded border p-2"
                    />
                </label>
                <label class="flex flex-col gap-1">
                    <span>Passwort</span>
                    <input
                        type="password"
                        formControlName="password"
                        autocomplete="current-password"
                        class="rounded border p-2"
                    />
                </label>
                @if (error()) {
                    <p id="login-error" role="alert" class="text-red-700">
                        {{ error() }}
                    </p>
                }
                <button
                    type="submit"
                    [disabled]="form.invalid || busy()"
                    class="rounded bg-slate-900 p-2 text-white disabled:opacity-50"
                >
                    Anmelden
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
}
