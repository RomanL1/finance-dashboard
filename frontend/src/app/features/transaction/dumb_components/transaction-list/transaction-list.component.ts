import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { TransactionRow } from '../../transaction.types';

@Component({
    selector: 'app-transaction-list',
    imports: [DatePipe, DecimalPipe, TranslatePipe],
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
                        class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2"
                    >
                        <time
                            [attr.datetime]="row.date"
                            class="text-sm text-gray-600"
                        >
                            {{ row.date | date: 'dd.MM.' }}
                        </time>
                        <div class="min-w-0">
                            <p class="truncate">{{ row.title }}</p>
                            <p class="truncate text-sm text-gray-600">
                                {{ row.category }}
                            </p>
                        </div>
                        <p
                            class="tabular-nums whitespace-nowrap"
                            [class.text-green-700]="row.amount > 0"
                        >
                            {{ row.amount > 0 ? '+' : ''
                            }}{{ row.amount / 100 | number: '1.2-2' }}
                            {{ row.currency }}
                        </p>
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListComponent {
    readonly rows = input.required<TransactionRow[]>();
}
