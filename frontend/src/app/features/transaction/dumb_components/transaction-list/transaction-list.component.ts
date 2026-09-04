import { DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import type { TransactionGroup } from '../../transaction.types';

@Component({
    selector: 'app-transaction-list',
    imports: [
        DecimalPipe,
        TranslatePipe,
        MatIcon,
        MatMenu,
        MatMenuItem,
        MatMenuTrigger,
        IconButtonComponent,
    ],
    template: `
        <h2 class="mb-2 text-lg font-semibold">
            {{ 'transaction.list.title' | translate }}
        </h2>
        @if (groups().length === 0) {
            <p>{{ 'transaction.list.empty' | translate }}</p>
        } @else {
            <div class="space-y-4">
                @for (group of groups(); track groupKey(group)) {
                    <section class="border-t border-gray-300 pt-2">
                        @if (group.kind === 'upcoming') {
                            <button
                                type="button"
                                class="flex w-full items-center gap-1 py-1 text-sm font-medium text-gray-500 uppercase"
                                [attr.aria-expanded]="upcomingOpen()"
                                (click)="upcomingOpen.set(!upcomingOpen())"
                            >
                                <mat-icon class="!text-lg">
                                    {{
                                        upcomingOpen()
                                            ? 'expand_more'
                                            : 'chevron_right'
                                    }}
                                </mat-icon>
                                {{
                                    'transaction.list.group.upcoming'
                                        | translate
                                            : { count: group.rows.length }
                                }}
                            </button>
                        } @else {
                            <h3
                                class="py-1 text-sm font-medium text-gray-500 uppercase"
                            >
                                @if (group.kind === 'past') {
                                    {{ group.year }}
                                } @else {
                                    {{
                                        'transaction.list.group.' + group.kind
                                            | translate
                                    }}
                                }
                            </h3>
                        }
                        @if (group.kind !== 'upcoming' || upcomingOpen()) {
                            <ul class="divide-y divide-gray-300">
                                @for (row of group.rows; track row.id) {
                                    <li
                                        class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 py-2"
                                    >
                                        <time
                                            [attr.datetime]="row.date"
                                            class="text-sm whitespace-nowrap text-gray-600"
                                        >
                                            {{ row.when }}
                                        </time>
                                        <div class="min-w-0">
                                            <p class="truncate">
                                                {{
                                                    row.title ??
                                                        ('transaction.list.uncategorized'
                                                            | translate)
                                                }}
                                            </p>
                                            @if (row.category) {
                                                <p
                                                    class="truncate text-sm text-gray-600"
                                                >
                                                    {{ row.category }}
                                                </p>
                                            }
                                        </div>
                                        <p
                                            class="tabular-nums whitespace-nowrap"
                                            [class.text-green-700]="
                                                row.amount > 0
                                            "
                                        >
                                            {{ row.amount > 0 ? '+' : ''
                                            }}{{
                                                row.amount / 100
                                                    | number: '1.2-2'
                                            }}
                                            {{ row.currency }}
                                        </p>
                                        <app-icon-button
                                            [matMenuTriggerFor]="menu"
                                            [ariaLabel]="
                                                'transaction.list.actions'
                                                    | translate
                                            "
                                        >
                                            <mat-icon>more_vert</mat-icon>
                                        </app-icon-button>
                                        <mat-menu #menu="matMenu">
                                            <button
                                                mat-menu-item
                                                (click)="edit.emit(row.id)"
                                            >
                                                <mat-icon>edit</mat-icon>
                                                {{
                                                    'transaction.list.edit'
                                                        | translate
                                                }}
                                            </button>
                                            <button
                                                mat-menu-item
                                                (click)="remove.emit(row.id)"
                                            >
                                                <mat-icon>delete</mat-icon>
                                                {{
                                                    'transaction.list.delete'
                                                        | translate
                                                }}
                                            </button>
                                        </mat-menu>
                                    </li>
                                }
                            </ul>
                        }
                    </section>
                }
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListComponent {
    readonly groups = input.required<TransactionGroup[]>();
    readonly edit = output<string>();
    readonly remove = output<string>();
    /** Future entries are collapsed by default; resets when the component is recreated. */
    protected readonly upcomingOpen = signal(false);

    protected groupKey(group: TransactionGroup): string {
        return group.kind === 'past' ? `past-${group.year}` : group.kind;
    }
}
