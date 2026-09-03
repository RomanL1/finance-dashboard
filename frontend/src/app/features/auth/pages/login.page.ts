import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { LoginFormComponent } from '../dumb_components/login-form/login-form.component';
import type { LoginCredentials } from '../auth.types';

@Component({
    selector: 'app-login-page',
    imports: [LoginFormComponent, TranslatePipe],
    template: `
        <main class="mx-auto mt-16 max-w-sm p-4">
            <h1 class="mb-6 text-2xl font-semibold">
                {{ 'auth.login.title' | translate }}
            </h1>
            <app-login-form
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="onLogin($event)"
            />
            <p class="mt-4 text-sm text-slate-600">
                {{ 'auth.login.demo' | translate }}
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
        private readonly translate: TranslateService,
    ) {}

    async onLogin(credentials: LoginCredentials): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.auth.signIn(credentials.email, credentials.password);
            await this.router.navigate(['/' + APP_PATHS.HOME]);
        } catch (e) {
            this.error.set(
                e instanceof Error
                    ? e.message
                    : this.translate.instant('auth.login.failed'),
            );
        } finally {
            this.busy.set(false);
        }
    }
}
