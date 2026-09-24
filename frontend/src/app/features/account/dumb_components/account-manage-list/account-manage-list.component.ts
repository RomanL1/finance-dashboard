import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
} from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { AccountBadgeComponent } from '../../../../components/account-badge/account-badge.component';
import { AmountComponent } from '../../../../components/amount/amount.component';
import { IconButtonComponent } from '../../../../components/button/button.component';
import { isActiveAccount, type AccountDto } from '../../account.types';

/** Settings view: every account, archived ones dimmed, with an actions menu per row. Same row grid as the transaction list. */
@Component({
    selector: 'app-account-manage-list',
    imports: [
        DatePipe,
        TranslatePipe,
        AccountBadgeComponent,
        AmountComponent,
        MatIcon,
        MatMenu,
        MatMenuContent,
        MatMenuItem,
        MatMenuTrigger,
        IconButtonComponent,
    ],
    template: `
        @if (accounts().length === 0) {
            <p class="type-body-medium text-on-surface-variant">
                {{ 'account.list.empty' | translate }}
            </p>
        } @else {
            <ul>
                @for (
                    account of accounts();
                    track account.id;
                    let last = $last
                ) {
                    <li
                        class="relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 py-2.5"
                        [class.opacity-60]="!isActive(account)"
                    >
                        <app-account-badge [number]="account.number" />
                        <div class="min-w-0">
                            <p class="type-body-large truncate text-on-surface">
                                {{ account.description }}
                            </p>
                            <p
                                class="type-body-medium truncate text-on-surface-variant"
                            >
                                @if (account.archivedAt; as archivedAt) {
                                    {{
                                        'account.manage.archivedSince'
                                            | translate
                                                : {
                                                      date:
                                                          archivedAt
                                                          | date: 'mediumDate',
                                                  }
                                    }}
                                } @else {
                                    {{
                                        'account.type.' + account.type
                                            | translate
                                    }}
                                    · {{ account.currency }}
                                }
                            </p>
                        </div>
                        <app-amount
                            [amount]="account.amount"
                            [currency]="account.currency"
                            [showPlus]="false"
                        />
                        <app-icon-button
                            [matMenuTriggerFor]="menu"
                            [matMenuTriggerData]="{ account }"
                            [ariaLabel]="'account.manage.actions' | translate"
                        >
                            <mat-icon svgIcon="more_vert" />
                        </app-icon-button>
                        @if (!last) {
                            <span
                                aria-hidden="true"
                                class="absolute right-0 bottom-0 left-[3.25rem] border-b border-outline-variant"
                            ></span>
                        }
                    </li>
                }
            </ul>
            <mat-menu #menu="matMenu">
                <ng-template matMenuContent let-account="account">
                    <button
                        mat-menu-item
                        type="button"
                        (click)="edit.emit(account.id)"
                    >
                        <mat-icon svgIcon="edit" />
                        {{ 'account.manage.edit' | translate }}
                    </button>
                    @if (account.archivedAt) {
                        <button
                            mat-menu-item
                            type="button"
                            (click)="unarchive.emit(account.id)"
                        >
                            <mat-icon svgIcon="unarchive" />
                            {{ 'account.manage.unarchive' | translate }}
                        </button>
                    } @else {
                        <button
                            mat-menu-item
                            type="button"
                            (click)="archive.emit(account.id)"
                        >
                            <mat-icon svgIcon="archive" />
                            {{ 'account.manage.archive' | translate }}
                        </button>
                    }
                    <button
                        mat-menu-item
                        type="button"
                        (click)="remove.emit(account.id)"
                    >
                        <mat-icon svgIcon="delete" />
                        {{ 'account.manage.delete' | translate }}
                    </button>
                </ng-template>
            </mat-menu>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountManageListComponent {
    readonly accounts = input.required<AccountDto[]>();
    readonly edit = output<string>();
    readonly archive = output<string>();
    readonly unarchive = output<string>();
    readonly remove = output<string>();

    protected isActive(account: AccountDto): boolean {
        return isActiveAccount(account);
    }
}
