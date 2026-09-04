import { DatePipe, DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import type { TransactionRow } from '../../transaction.types';

@Component({
    selector: 'app-transaction-list',
    imports: [
        DatePipe,
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
        @if (rows().length === 0) {
            <p>{{ 'transaction.list.empty' | translate }}</p>
        } @else {
            <ul class="divide-y">
                @for (row of rows(); track row.id) {
                    <li
                        class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 py-2"
                    >
                        <time
                            [attr.datetime]="row.date"
                            class="text-sm text-gray-600"
                        >
                            {{ row.date | date: 'dd.MM. HH:mm' }}
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
                                <p class="truncate text-sm text-gray-600">
                                    {{ row.category }}
                                </p>
                            }
                        </div>
                        <p
                            class="tabular-nums whitespace-nowrap"
                            [class.text-green-700]="row.amount > 0"
                        >
                            {{ row.amount > 0 ? '+' : ''
                            }}{{ row.amount / 100 | number: '1.2-2' }}
                            {{ row.currency }}
                        </p>
                        <app-icon-button
                            [matMenuTriggerFor]="menu"
                            [ariaLabel]="'transaction.list.actions' | translate"
                        >
                            <mat-icon>more_vert</mat-icon>
                        </app-icon-button>
                        <mat-menu #menu="matMenu">
                            <button mat-menu-item (click)="edit.emit(row.id)">
                                <mat-icon>edit</mat-icon>
                                {{ 'transaction.list.edit' | translate }}
                            </button>
                            <button mat-menu-item (click)="remove.emit(row.id)">
                                <mat-icon>delete</mat-icon>
                                {{ 'transaction.list.delete' | translate }}
                            </button>
                        </mat-menu>
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListComponent {
    readonly rows = input.required<TransactionRow[]>();
    readonly edit = output<string>();
    readonly remove = output<string>();
}
