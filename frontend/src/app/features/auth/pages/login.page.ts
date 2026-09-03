import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { LoginFormComponent } from '../dumb_components/login-form/login-form.component';
import type { LoginCredentials } from '../auth.types';

@Component({
    selector: 'app-login-page',
    imports: [LoginFormComponent],
    template: `
        <main class="mx-auto mt-16 max-w-sm p-4">
            <h1 class="mb-6 text-2xl font-semibold">Login</h1>
            <app-login-form
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="onLogin($event)"
            />
            <p class="mt-4 text-sm text-slate-600">
                Demo: demo&#64;finance.local / demo-password
            </p>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
    ) {}

    async onLogin(credentials: LoginCredentials): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.auth.signIn(credentials.email, credentials.password);
            await this.router.navigate(['/' + APP_PATHS.HOME]);
        } catch (e) {
            this.error.set(
                e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen',
            );
        } finally {
            this.busy.set(false);
        }
    }
}
