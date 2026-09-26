import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { AuthLayoutComponent } from '../dumb_components/auth-layout/auth-layout.component';
import { SignupFormComponent } from '../dumb_components/signup-form/signup-form.component';
import { authErrorKey } from '../services/auth-error';
import type { SignUpData } from '../auth.types';

@Component({
    selector: 'app-signup-page',
    imports: [
        AuthLayoutComponent,
        SignupFormComponent,
        RouterLink,
        TranslatePipe,
    ],
    template: `
        <app-auth-layout [heading]="'auth.signup.title' | translate">
            <app-signup-form
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="onSignUp($event)"
            />
            <a
                class="type-label-large text-primary"
                [routerLink]="'/' + paths.LOGIN"
                >{{ 'auth.signup.toLogin' | translate }}</a
            >
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPage {
    readonly paths = APP_PATHS;
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
        private readonly translate: TranslateService,
    ) {}

    /** The backend answers a taken email like a new one, so this always continues to check-email. */
    async onSignUp({ name, email, password }: SignUpData): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.auth.signUp(name, email, password);
            await this.router.navigate(['/' + APP_PATHS.CHECK_EMAIL], {
                queryParams: { email },
            });
        } catch (e) {
            this.error.set(this.translate.instant(authErrorKey(e)));
        } finally {
            this.busy.set(false);
        }
    }
}
