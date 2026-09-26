import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { AuthLayoutComponent } from '../dumb_components/auth-layout/auth-layout.component';
import { ResetPasswordFormComponent } from '../dumb_components/reset-password-form/reset-password-form.component';
import { authErrorKey } from '../services/auth-error';

/** Target of the password-reset mail. */
@Component({
    selector: 'app-reset-password-page',
    imports: [
        AuthLayoutComponent,
        ResetPasswordFormComponent,
        RouterLink,
        TranslatePipe,
    ],
    template: `
        <app-auth-layout [heading]="'auth.resetPassword.title' | translate">
            @if (token()) {
                <app-reset-password-form
                    [busy]="busy()"
                    [errorMessage]="error()"
                    (submitted)="onSubmit($event)"
                />
            } @else {
                <p role="alert" class="type-body-medium text-error">
                    {{ 'auth.errors.INVALID_TOKEN' | translate }}
                </p>
            }
            <a
                class="type-label-large text-primary"
                [routerLink]="'/' + paths.FORGOT_PASSWORD"
                >{{ 'auth.resetPassword.newLink' | translate }}</a
            >
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
    /** `?token=` from the mailed link. */
    readonly token = input<string>();

    readonly paths = APP_PATHS;
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
        private readonly translate: TranslateService,
    ) {}

    /** Resetting ends every session, so the user logs in again with the new password. */
    async onSubmit(password: string): Promise<void> {
        const token = this.token();
        if (!token) return;
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.auth.resetPassword(token, password);
            await this.router.navigate(['/' + APP_PATHS.LOGIN], {
                queryParams: { reset: 'done' },
            });
        } catch (e) {
            this.error.set(this.translate.instant(authErrorKey(e)));
        } finally {
            this.busy.set(false);
        }
    }
}
