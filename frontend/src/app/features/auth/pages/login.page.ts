import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    OnInit,
    signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonComponent } from '../../../components/button/button.component';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { AuthLayoutComponent } from '../dumb_components/auth-layout/auth-layout.component';
import { DemoLoginComponent } from '../dumb_components/demo-login/demo-login.component';
import { LoginFormComponent } from '../dumb_components/login-form/login-form.component';
import { DEMO_USERS } from '../demo-users';
import { authErrorKey } from '../services/auth-error';
import { DemoLoginService } from '../services/demo-login.service';
import type { DemoUser, LoginCredentials } from '../auth.types';

@Component({
    selector: 'app-login-page',
    imports: [
        AuthLayoutComponent,
        LoginFormComponent,
        DemoLoginComponent,
        ButtonComponent,
        RouterLink,
        TranslatePipe,
    ],
    template: `
        <app-auth-layout [heading]="'auth.login.title' | translate">
            @if (passwordReset()) {
                <p role="status" class="type-body-medium">
                    {{ 'auth.login.passwordChanged' | translate }}
                </p>
            }
            <app-login-form
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="onLogin($event)"
            />
            @if (unverifiedEmail(); as email) {
                <app-button
                    variant="tonal"
                    [disabled]="busy()"
                    (clicked)="resendVerification(email)"
                >
                    {{ 'auth.login.resendVerification' | translate }}
                </app-button>
            }
            <div class="flex flex-wrap justify-between gap-2">
                <a
                    class="type-label-large text-primary"
                    [routerLink]="'/' + paths.FORGOT_PASSWORD"
                    >{{ 'auth.login.forgotPassword' | translate }}</a
                >
                <a
                    class="type-label-large text-primary"
                    [routerLink]="'/' + paths.SIGNUP"
                    >{{ 'auth.login.toSignup' | translate }}</a
                >
            </div>
            @if (demoUsers().length) {
                <app-demo-login
                    [users]="demoUsers()"
                    [busy]="busy()"
                    (selected)="onDemoLogin($event)"
                />
            }
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
    /** `?reset=done` after a successful password reset. */
    readonly reset = input<string>();

    readonly passwordReset = computed(() => this.reset() === 'done');

    readonly paths = APP_PATHS;
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    /** Set when the login failed because the email is not verified yet: offers a new link. */
    readonly unverifiedEmail = signal<string | null>(null);
    readonly demoUsers = signal<readonly DemoUser[]>([]);

    constructor(
        private readonly auth: AuthService,
        private readonly demoLogin: DemoLoginService,
        private readonly router: Router,
        private readonly translate: TranslateService,
    ) {}

    async ngOnInit(): Promise<void> {
        if (await this.demoLogin.available()) {
            this.demoUsers.set(DEMO_USERS);
        }
    }

    async onLogin({ email, password }: LoginCredentials): Promise<void> {
        this.unverifiedEmail.set(null);
        await this.run(async () => {
            try {
                await this.auth.signIn(email, password);
            } catch (e) {
                if (authErrorKey(e) === 'auth.errors.EMAIL_NOT_VERIFIED') {
                    this.unverifiedEmail.set(email);
                }
                throw e;
            }
            await this.router.navigate(['/' + APP_PATHS.HOME]);
        });
    }

    onDemoLogin(user: DemoUser): Promise<void> {
        return this.onLogin(user);
    }

    async resendVerification(email: string): Promise<void> {
        await this.run(async () => {
            await this.auth.resendVerification(email);
            await this.router.navigate(['/' + APP_PATHS.CHECK_EMAIL], {
                queryParams: { email },
            });
        });
    }

    private async run(action: () => Promise<void>): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            await action();
        } catch (e) {
            this.error.set(this.translate.instant(authErrorKey(e)));
        } finally {
            this.busy.set(false);
        }
    }
}
