import { DatePipe, DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatListItem, MatList } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import { isActiveAccount, type AccountDto } from '../../account.types';

/** Settings view: every account, archived ones dimmed, with an actions menu per row. */
@Component({
    selector: 'app-account-manage-list',
    imports: [
        DatePipe,
        DecimalPipe,
        TranslatePipe,
        MatIcon,
        MatList,
        MatListItem,
        MatMenu,
        MatMenuItem,
        MatMenuTrigger,
        IconButtonComponent,
    ],
    template: `
        @if (accounts().length === 0) {
            <p>{{ 'account.list.empty' | translate }}</p>
        } @else {
            <mat-list>
                @for (account of accounts(); track account.id) {
                    <mat-list-item
                        [class.opacity-60]="!isActive(account)"
                        class="!h-auto !py-2"
                    >
                        <span matListItemTitle>{{ account.description }}</span>
                        <span matListItemLine>
                            {{ account.amount / 100 | number: '1.2-2' }}
                            {{ account.currency }}
                            @if (account.archivedAt; as archivedAt) {
                                ·
                                {{
                                    'account.manage.archivedSince'
                                        | translate
                                            : {
                                                  date:
                                                      archivedAt
                                                      | date: 'mediumDate',
                                              }
                                }}
                            }
                        </span>
                        <app-icon-button
                            matListItemMeta
                            [matMenuTriggerFor]="menu"
                            [ariaLabel]="'account.manage.actions' | translate"
                        >
                            <mat-icon>more_vert</mat-icon>
                        </app-icon-button>
                        <mat-menu #menu="matMenu">
                            <button
                                mat-menu-item
                                type="button"
                                (click)="edit.emit(account.id)"
                            >
                                <mat-icon>edit</mat-icon>
                                {{ 'account.manage.edit' | translate }}
                            </button>
                            @if (account.archivedAt) {
                                <button
                                    mat-menu-item
                                    type="button"
                                    (click)="unarchive.emit(account.id)"
                                >
                                    <mat-icon>unarchive</mat-icon>
                                    {{ 'account.manage.unarchive' | translate }}
                                </button>
                            } @else {
                                <button
                                    mat-menu-item
                                    type="button"
                                    (click)="archive.emit(account.id)"
                                >
                                    <mat-icon>archive</mat-icon>
                                    {{ 'account.manage.archive' | translate }}
                                </button>
                            }
                            <button
                                mat-menu-item
                                type="button"
                                (click)="remove.emit(account.id)"
                            >
                                <mat-icon>delete</mat-icon>
                                {{ 'account.manage.delete' | translate }}
                            </button>
                        </mat-menu>
                    </mat-list-item>
                }
            </mat-list>
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

    readonly isActive = isActiveAccount;
}
