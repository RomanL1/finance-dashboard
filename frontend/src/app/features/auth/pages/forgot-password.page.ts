import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { AuthLayoutComponent } from '../dumb_components/auth-layout/auth-layout.component';
import { ForgotPasswordFormComponent } from '../dumb_components/forgot-password-form/forgot-password-form.component';
import { authErrorKey } from '../services/auth-error';

@Component({
    selector: 'app-forgot-password-page',
    imports: [
        AuthLayoutComponent,
        ForgotPasswordFormComponent,
        RouterLink,
        TranslatePipe,
    ],
    template: `
        <app-auth-layout [heading]="'auth.forgotPassword.title' | translate">
            @if (sentTo(); as email) {
                <p role="status" class="type-body-large">
                    {{ 'auth.forgotPassword.sent' | translate: { email } }}
                </p>
            } @else {
                <p class="type-body-medium text-on-surface-variant">
                    {{ 'auth.forgotPassword.intro' | translate }}
                </p>
                <app-forgot-password-form
                    [busy]="busy()"
                    [errorMessage]="error()"
                    (submitted)="onSubmit($event)"
                />
            }
            <a
                class="type-label-large text-primary"
                [routerLink]="'/' + paths.LOGIN"
                >{{ 'auth.forgotPassword.toLogin' | translate }}</a
            >
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
    readonly paths = APP_PATHS;
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly sentTo = signal<string | null>(null);

    constructor(
        private readonly auth: AuthService,
        private readonly translate: TranslateService,
    ) {}

    async onSubmit(email: string): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.auth.requestPasswordReset(email);
            this.sentTo.set(email);
        } catch (e) {
            this.error.set(this.translate.instant(authErrorKey(e)));
        } finally {
            this.busy.set(false);
        }
    }
}
