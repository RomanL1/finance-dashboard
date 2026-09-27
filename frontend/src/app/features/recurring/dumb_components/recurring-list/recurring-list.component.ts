import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AccountBadgeComponent } from '../../../../components/account-badge/account-badge.component';
import { AmountComponent } from '../../../../components/amount/amount.component';
import { IconButtonComponent } from '../../../../components/button/button.component';
import { CategoryAvatarComponent } from '../../../../components/category-avatar/category-avatar.component';
import { parseLocalDate, type RecurringRow } from '../../recurring.types';

/** Same row grid as the transaction list. The row edits; the trailing button pauses or resumes. */
@Component({
    selector: 'app-recurring-list',
    imports: [
        DatePipe,
        TranslatePipe,
        MatIcon,
        MatRipple,
        AccountBadgeComponent,
        AmountComponent,
        CategoryAvatarComponent,
        IconButtonComponent,
    ],
    template: `
        @if (rows().length === 0) {
            <div
                class="flex flex-col items-center gap-2 py-10 text-center text-on-surface-variant"
            >
                <mat-icon
                    class="!h-12 !w-12 !text-5xl"
                    svgIcon="event_repeat"
                />
                <p class="type-body-large text-on-surface">
                    {{ 'recurring.list.empty' | translate }}
                </p>
                <p class="type-body-medium">
                    {{ 'recurring.list.emptyHint' | translate }}
                </p>
            </div>
        } @else {
            <ul>
                @for (row of rows(); track row.id; let last = $last) {
                    <li
                        class="relative flex items-center gap-1"
                        [class.opacity-60]="row.paused"
                    >
                        <button
                            type="button"
                            matRipple
                            class="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5 text-left"
                            (click)="edit.emit(row.id)"
                        >
                            <app-category-avatar
                                [categoryId]="row.categoryId"
                                [name]="row.category"
                            />
                            <div class="min-w-0">
                                <p
                                    class="type-body-large truncate text-on-surface"
                                >
                                    {{
                                        row.title ??
                                            ('transaction.list.uncategorized'
                                                | translate)
                                    }}
                                </p>
                                <p
                                    class="type-body-medium truncate text-on-surface-variant"
                                >
                                    {{
                                        'recurring.schedule.' + row.interval
                                            | translate: { anchor: row.anchor }
                                    }}
                                    @if (row.weekendShift) {
                                        ·
                                        {{
                                            'recurring.list.weekendShift'
                                                | translate
                                        }}
                                    }
                                </p>
                                <p
                                    class="type-body-small flex min-w-0 items-center gap-1.5 text-on-surface-variant"
                                >
                                    <app-account-badge
                                        [number]="row.accountNumber"
                                        size="sm"
                                    />
                                    <span class="truncate">{{
                                        row.accountName
                                    }}</span>
                                </p>
                            </div>
                            <div class="flex flex-col items-end">
                                <span class="flex items-center gap-1">
                                    @if (row.varyingAmount) {
                                        <span
                                            class="type-label-small text-on-surface-variant"
                                            >{{
                                                'recurring.list.approx'
                                                    | translate
                                            }}</span
                                        >
                                    }
                                    <app-amount
                                        [amount]="row.amount"
                                        [currency]="row.currency"
                                        [showCurrency]="false"
                                    />
                                </span>
                                <span
                                    class="type-label-small whitespace-nowrap text-on-surface-variant"
                                >
                                    @if (row.paused) {
                                        {{
                                            'recurring.list.paused' | translate
                                        }}
                                    } @else {
                                        {{
                                            'recurring.list.next'
                                                | translate
                                                    : {
                                                          date:
                                                              nextDate(row)
                                                              | date
                                                                  : 'dd.MM.yyyy',
                                                      }
                                        }}
                                    }
                                </span>
                            </div>
                        </button>
                        <app-icon-button
                            [ariaLabel]="
                                (row.paused
                                    ? 'recurring.list.resume'
                                    : 'recurring.list.pause'
                                ) | translate
                            "
                            (clicked)="togglePaused.emit(row)"
                        >
                            <mat-icon
                                [svgIcon]="row.paused ? 'play_arrow' : 'pause'"
                            />
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
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringListComponent {
    readonly rows = input.required<RecurringRow[]>();
    readonly edit = output<string>();
    readonly togglePaused = output<RecurringRow>();

    protected nextDate(row: RecurringRow): Date {
        return parseLocalDate(row.nextDate);
    }
}
