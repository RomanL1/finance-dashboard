import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import type { HouseholdMemberDto } from '../../household.types';

/** Everyone in the household. With `canRemove`, members (never the owner) get a remove button. */
@Component({
    selector: 'app-member-list',
    imports: [IconButtonComponent, MatIcon, TranslatePipe],
    template: `
        <ul>
            @for (member of members(); track member.userId; let last = $last) {
                <li
                    class="grid min-h-14 grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5"
                    [class.border-b]="!last"
                    [class.border-outline-variant]="!last"
                >
                    <div class="min-w-0">
                        <p class="type-body-large truncate text-on-surface">
                            {{ member.name }}
                        </p>
                        <p
                            class="type-body-medium truncate text-on-surface-variant"
                        >
                            {{ member.email }}
                        </p>
                    </div>
                    <span class="type-label-large text-on-surface-variant">
                        {{
                            'settings.household.roles.' + member.role
                                | translate
                        }}
                    </span>
                    @if (canRemove() && member.role === 'member') {
                        <app-icon-button
                            [ariaLabel]="
                                'members.remove.action'
                                    | translate: { name: member.name }
                            "
                            (clicked)="remove.emit(member.userId)"
                        >
                            <mat-icon svgIcon="person_remove" />
                        </app-icon-button>
                    } @else {
                        <span aria-hidden="true"></span>
                    }
                </li>
            }
        </ul>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberListComponent {
    readonly members = input.required<HouseholdMemberDto[]>();
    readonly canRemove = input(false);
    readonly remove = output<string>();
}
