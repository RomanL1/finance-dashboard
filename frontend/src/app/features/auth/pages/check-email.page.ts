import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonComponent } from '../../../components/button/button.component';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS, INVITE_PARAM } from '../../../config/paths.config';
import { AuthLayoutComponent } from '../dumb_components/auth-layout/auth-layout.component';
import { authErrorKey } from '../services/auth-error';

/** After sign-up (or a login with an unverified email): points to the mailed link, offers a new one. */
@Component({
    selector: 'app-check-email-page',
    imports: [AuthLayoutComponent, ButtonComponent, RouterLink, TranslatePipe],
    template: `
        <app-auth-layout [heading]="'auth.checkEmail.title' | translate">
            <p class="type-body-large">
                @if (email(); as address) {
                    {{
                        'auth.checkEmail.sentTo' | translate: { email: address }
                    }}
                } @else {
                    {{ 'auth.checkEmail.sent' | translate }}
                }
            </p>
            <p class="type-body-medium text-on-surface-variant">
                {{ 'auth.checkEmail.hint' | translate }}
            </p>
            @if (invite()) {
                <p class="type-body-medium">
                    {{ 'auth.checkEmail.inviteHint' | translate }}
                </p>
            }
            @if (resent()) {
                <p role="status" class="type-body-medium">
                    {{ 'auth.checkEmail.resent' | translate }}
                </p>
            }
            @if (error()) {
                <p role="alert" class="type-body-medium text-error">
                    {{ error() }}
                </p>
            }
            @if (email(); as address) {
                <app-button
                    variant="tonal"
                    [disabled]="busy()"
                    (clicked)="resend(address)"
                >
                    {{ 'auth.checkEmail.resend' | translate }}
                </app-button>
            }
            <a
                class="type-label-large text-primary"
                [routerLink]="'/' + paths.LOGIN"
                [queryParams]="inviteParams()"
                >{{ 'auth.checkEmail.toLogin' | translate }}</a
            >
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckEmailPage {
    /** `?email=` from the sign-up or login page. */
    readonly email = input<string>();
    /** `?invite=` when the sign-up started from an invitation link: the link must be opened again after verifying. */
    readonly invite = input<string>();
    readonly inviteParams = computed(() => {
        const invite = this.invite();
        return invite ? { [INVITE_PARAM]: invite } : {};
    });

    readonly paths = APP_PATHS;
    readonly busy = signal(false);
    readonly resent = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        private readonly auth: AuthService,
        private readonly translate: TranslateService,
    ) {}

    async resend(email: string): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        this.resent.set(false);
        try {
            await this.auth.resendVerification(email);
            this.resent.set(true);
        } catch (e) {
            this.error.set(this.translate.instant(authErrorKey(e)));
        } finally {
            this.busy.set(false);
        }
    }
}
