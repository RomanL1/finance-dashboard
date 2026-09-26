import {
    ChangeDetectionStrategy,
    Component,
    input,
    OnInit,
    signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { AuthLayoutComponent } from '../dumb_components/auth-layout/auth-layout.component';
import { authErrorKey } from '../services/auth-error';

/** Target of the verification mail. Verifying signs the user in; the guards then lead to onboarding. */
@Component({
    selector: 'app-verify-email-page',
    imports: [AuthLayoutComponent, RouterLink, TranslatePipe],
    template: `
        <app-auth-layout [heading]="'auth.verifyEmail.title' | translate">
            @if (errorKey(); as key) {
                <p role="alert" class="type-body-medium text-error">
                    {{ key | translate }}
                </p>
                <p class="type-body-medium text-on-surface-variant">
                    {{ 'auth.verifyEmail.newLinkHint' | translate }}
                </p>
                <a
                    class="type-label-large text-primary"
                    [routerLink]="'/' + paths.LOGIN"
                    >{{ 'auth.verifyEmail.toLogin' | translate }}</a
                >
            } @else {
                <p role="status" class="type-body-large">
                    {{ 'auth.verifyEmail.verifying' | translate }}
                </p>
            }
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage implements OnInit {
    /** `?token=` from the mailed link. */
    readonly token = input<string>();

    readonly paths = APP_PATHS;
    readonly errorKey = signal<string | null>(null);

    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
    ) {}

    async ngOnInit(): Promise<void> {
        const token = this.token();
        if (!token) {
            this.errorKey.set('auth.errors.INVALID_TOKEN');
            return;
        }
        try {
            await this.auth.verifyEmail(token);
            await this.router.navigate(['/' + APP_PATHS.HOME]);
        } catch (e) {
            this.errorKey.set(authErrorKey(e));
        }
    }
}
