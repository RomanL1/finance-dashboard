import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import type { InvitationDto } from '../../household.types';

/** Open invitations. Their links cannot be shown again, so the note and the dates tell them apart. */
@Component({
    selector: 'app-invitation-list',
    imports: [DatePipe, IconButtonComponent, MatIcon, TranslatePipe],
    template: `
        @if (invitations().length === 0) {
            <p class="type-body-medium text-on-surface-variant">
                {{ 'members.invitations.empty' | translate }}
            </p>
        } @else {
            <ul>
                @for (
                    invitation of invitations();
                    track invitation.id;
                    let last = $last
                ) {
                    <li
                        class="grid min-h-14 grid-cols-[1fr_auto] items-center gap-x-3 py-2.5"
                        [class.border-b]="!last"
                        [class.border-outline-variant]="!last"
                    >
                        <div class="min-w-0">
                            <p class="type-body-large truncate text-on-surface">
                                {{
                                    invitation.note ||
                                        ('members.invitations.noNote'
                                            | translate)
                                }}
                            </p>
                            <p
                                class="type-body-medium truncate text-on-surface-variant"
                            >
                                {{
                                    'members.invitations.validUntil'
                                        | translate
                                            : {
                                                  date:
                                                      invitation.expiresAt
                                                      | date: 'short',
                                              }
                                }}
                            </p>
                        </div>
                        <app-icon-button
                            [ariaLabel]="
                                'members.invitations.revoke' | translate
                            "
                            (clicked)="revoke.emit(invitation.id)"
                        >
                            <mat-icon svgIcon="delete" />
                        </app-icon-button>
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationListComponent {
    readonly invitations = input.required<InvitationDto[]>();
    readonly revoke = output<string>();
}
