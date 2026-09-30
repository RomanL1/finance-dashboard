import { Clipboard } from '@angular/cdk/clipboard';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    resource,
    signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonComponent } from '../../../components/button/button.component';
import { DialogService } from '../../../components/dialog/dialog.service';
import { SectionHeaderComponent } from '../../../components/section-header/section-header.component';
import { APP_PATHS } from '../../../config/paths.config';
import { InvitationFormComponent } from '../dumb_components/invitation-form/invitation-form.component';
import { InvitationListComponent } from '../dumb_components/invitation-list/invitation-list.component';
import { MemberListComponent } from '../dumb_components/member-list/member-list.component';
import { HouseholdService } from '../services/household.service';
import { InvitationService } from '../services/invitation.service';
import { MemberService } from '../services/member.service';

/** Settings subpage: who is in the household. The owner also invites by link and removes members. */
@Component({
    selector: 'app-members-page',
    imports: [
        ButtonComponent,
        InvitationFormComponent,
        InvitationListComponent,
        MatIcon,
        MatProgressSpinner,
        MemberListComponent,
        RouterLink,
        SectionHeaderComponent,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto max-w-lg space-y-6 p-4">
            <header class="flex items-center gap-2">
                <a
                    class="flex size-10 items-center justify-center rounded-full text-on-surface"
                    [routerLink]="'/' + paths.SETTINGS"
                    [attr.aria-label]="'members.back' | translate"
                >
                    <mat-icon svgIcon="arrow_back" />
                </a>
                <h1 class="type-headline-small text-on-surface">
                    {{ 'members.title' | translate }}
                </h1>
            </header>
            @if (household.isLoading() || members.isLoading()) {
                <mat-spinner class="mx-auto" diameter="40" />
            } @else if (household.value(); as h) {
                <section>
                    <app-section-header [title]="h.name" />
                    <app-member-list
                        [members]="members.value() ?? []"
                        [canRemove]="isOwner()"
                        (remove)="removeMember(h.id, $event)"
                    />
                </section>
                @if (isOwner()) {
                    <section>
                        <app-section-header
                            [title]="'members.invitations.title' | translate"
                        />
                        <p
                            class="type-body-medium mb-3 text-on-surface-variant"
                        >
                            {{ 'members.invitations.description' | translate }}
                        </p>
                        @if (createdLink(); as link) {
                            <div
                                class="mb-4 space-y-2 rounded-m3-lg bg-surface-low p-4"
                                role="status"
                            >
                                <p class="type-label-large text-on-surface">
                                    {{
                                        'members.invitations.linkReady'
                                            | translate
                                    }}
                                </p>
                                <p
                                    class="type-body-medium break-all text-on-surface"
                                    data-testid="invitation-link"
                                >
                                    {{ link }}
                                </p>
                                <p
                                    class="type-body-small text-on-surface-variant"
                                >
                                    {{
                                        'members.invitations.linkOnce'
                                            | translate
                                    }}
                                </p>
                                <app-button
                                    type="button"
                                    (clicked)="copy(link)"
                                >
                                    {{
                                        (copied()
                                            ? 'members.invitations.copied'
                                            : 'members.invitations.copy'
                                        ) | translate
                                    }}
                                </app-button>
                            </div>
                        }
                        <app-invitation-form
                            [busy]="busy()"
                            [errorMessage]="error()"
                            (submitted)="createInvitation(h.id, $event)"
                        />
                        <h3 class="type-title-small mt-6 mb-1 text-on-surface">
                            {{ 'members.invitations.open' | translate }}
                        </h3>
                        <app-invitation-list
                            [invitations]="invitations.value() ?? []"
                            (revoke)="revokeInvitation(h.id, $event)"
                        />
                    </section>
                }
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersPage {
    protected readonly paths = APP_PATHS;

    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    protected readonly isOwner = computed(
        () => this.household.value()?.role === 'owner',
    );

    readonly members = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.memberService.list(params),
    });

    /** Only the owner may read invitations; for members the request is never sent. */
    readonly invitations = resource({
        params: () => (this.isOwner() ? this.household.value()?.id : undefined),
        loader: ({ params }) => this.invitationService.list(params),
    });

    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    /** The link of the invitation just created. Gone after a reload: the server keeps no copy. */
    readonly createdLink = signal<string | null>(null);
    readonly copied = signal(false);

    constructor(
        private readonly householdService: HouseholdService,
        private readonly memberService: MemberService,
        private readonly invitationService: InvitationService,
        private readonly dialogs: DialogService,
        private readonly clipboard: Clipboard,
        private readonly translate: TranslateService,
    ) {}

    async createInvitation(householdId: string, note: string): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            const created = await this.invitationService.create(
                householdId,
                note,
            );
            this.createdLink.set(this.invitationService.linkFor(created.token));
            this.copied.set(false);
            this.invitations.reload();
        } catch {
            // The only refusal an owner can run into is the cap on open invitations.
            this.error.set(
                this.translate.instant('members.invitations.createFailed'),
            );
        } finally {
            this.busy.set(false);
        }
    }

    copy(link: string): void {
        this.copied.set(this.clipboard.copy(link));
    }

    async revokeInvitation(
        householdId: string,
        invitationId: string,
    ): Promise<void> {
        const confirmed = await this.dialogs.confirm({
            title: 'members.invitations.revokeTitle',
            message: 'members.invitations.revokeMessage',
            confirm: 'members.invitations.revoke',
            cancel: 'members.cancel',
        });
        if (!confirmed) return;
        await this.invitationService.revoke(householdId, invitationId);
        // The link on screen may be the revoked one; it cannot be told apart, so it goes too.
        this.createdLink.set(null);
        this.invitations.reload();
    }

    async removeMember(householdId: string, userId: string): Promise<void> {
        const confirmed = await this.dialogs.confirm({
            title: 'members.remove.title',
            message: 'members.remove.message',
            confirm: 'members.remove.confirm',
            cancel: 'members.cancel',
        });
        if (!confirmed) return;
        await this.memberService.remove(householdId, userId);
        this.members.reload();
    }
}
