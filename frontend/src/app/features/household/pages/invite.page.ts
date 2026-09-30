import {
    ChangeDetectionStrategy,
    Component,
    input,
    OnInit,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../components/button/button.component';
import { APP_PATHS, INVITE_PARAM } from '../../../config/paths.config';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthLayoutComponent } from '../../auth/dumb_components/auth-layout/auth-layout.component';
import type { InvitationPreviewDto } from '../household.types';
import { HouseholdService } from '../services/household.service';
import { InvitationService } from '../services/invitation.service';

/**
 * Target of an invitation link. Opening it changes nothing: joining takes the button,
 * so link previews of messengers cannot use the link up.
 */
@Component({
    selector: 'app-invite-page',
    imports: [AuthLayoutComponent, ButtonComponent, RouterLink, TranslatePipe],
    template: `
        <app-auth-layout [heading]="'invite.title' | translate">
            @if (invalid()) {
                <p role="alert" class="type-body-large">
                    {{ 'invite.invalid' | translate }}
                </p>
                <a
                    class="type-label-large text-primary"
                    [routerLink]="'/' + paths.HOME"
                    >{{ 'invite.toApp' | translate }}</a
                >
            } @else if (preview(); as invitation) {
                <p class="type-body-large">
                    {{ 'invite.message' | translate: invitation }}
                </p>
                @if (signedIn()) {
                    <app-button [disabled]="busy()" (clicked)="join()">
                        {{ 'invite.join' | translate }}
                    </app-button>
                } @else {
                    <p class="type-body-medium text-on-surface-variant">
                        {{ 'invite.signInFirst' | translate }}
                    </p>
                    <div class="flex flex-wrap gap-4">
                        <a
                            class="type-label-large text-primary"
                            [routerLink]="'/' + paths.LOGIN"
                            [queryParams]="inviteParams()"
                            >{{ 'invite.toLogin' | translate }}</a
                        >
                        <a
                            class="type-label-large text-primary"
                            [routerLink]="'/' + paths.SIGNUP"
                            [queryParams]="inviteParams()"
                            >{{ 'invite.toSignup' | translate }}</a
                        >
                    </div>
                }
            } @else {
                <p role="status" class="type-body-large">
                    {{ 'invite.loading' | translate }}
                </p>
            }
        </app-auth-layout>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePage implements OnInit {
    /** `:token` from the link. */
    readonly token = input.required<string>();

    protected readonly paths = APP_PATHS;
    readonly preview = signal<InvitationPreviewDto | null>(null);
    /** Unknown, expired, revoked and used links look the same. */
    readonly invalid = signal(false);
    readonly signedIn = signal(false);
    readonly busy = signal(false);

    constructor(
        private readonly auth: AuthService,
        private readonly invitations: InvitationService,
        private readonly households: HouseholdService,
    ) {}

    async ngOnInit(): Promise<void> {
        if (!this.auth.ready()) await this.auth.refresh();
        this.signedIn.set(this.auth.isAuthenticated());
        const preview = await this.invitations.preview(this.token());
        if (preview) this.preview.set(preview);
        else this.invalid.set(true);
    }

    /** The joined household becomes the active one. Someone already in it just switches to it. */
    async join(): Promise<void> {
        this.busy.set(true);
        const household = await this.invitations.accept(this.token());
        if (household) {
            this.households.switchTo(household.id);
            return;
        }
        this.invalid.set(true);
        this.busy.set(false);
    }

    protected inviteParams(): Record<string, string> {
        return { [INVITE_PARAM]: this.token() };
    }
}
