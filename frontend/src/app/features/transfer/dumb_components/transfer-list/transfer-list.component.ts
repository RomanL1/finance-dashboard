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
import type { TransferRow } from '../../transfer.types';

/** Transfers newest first. Same row grid as the transaction list; the whole row edits. */
@Component({
    selector: 'app-transfer-list',
    imports: [
        TranslatePipe,
        MatIcon,
        MatRipple,
        AccountBadgeComponent,
        AmountComponent,
    ],
    template: `
        @if (rows().length === 0) {
            <div
                class="flex flex-col items-center gap-2 py-10 text-center text-on-surface-variant"
            >
                <mat-icon class="!h-12 !w-12 !text-5xl" svgIcon="sync_alt" />
                <p class="type-body-large text-on-surface">
                    {{ 'transfer.list.empty' | translate }}
                </p>
                <p class="type-body-medium">
                    {{ 'transfer.list.emptyHint' | translate }}
                </p>
            </div>
        } @else {
            <ul>
                @for (row of rows(); track row.id; let last = $last) {
                    <li class="relative">
                        <button
                            type="button"
                            matRipple
                            class="grid w-full min-w-0 grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5 text-left"
                            (click)="edit.emit(row.id)"
                        >
                            <span
                                aria-hidden="true"
                                class="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"
                            >
                                <mat-icon svgIcon="sync_alt" />
                            </span>
                            <div class="min-w-0">
                                <p
                                    class="type-body-large truncate text-on-surface"
                                >
                                    {{
                                        row.title ??
                                            ('transfer.list.untitled'
                                                | translate)
                                    }}
                                </p>
                                <p
                                    class="type-body-medium flex min-w-0 items-center gap-1.5 text-on-surface-variant"
                                >
                                    <app-account-badge
                                        [number]="row.fromNumber"
                                        size="sm"
                                    />
                                    <span class="min-w-0 truncate">{{
                                        row.fromName
                                    }}</span>
                                    <span
                                        class="shrink-0"
                                        role="img"
                                        [attr.aria-label]="
                                            'transfer.list.to' | translate
                                        "
                                        >→</span
                                    >
                                    <app-account-badge
                                        [number]="row.toNumber"
                                        size="sm"
                                    />
                                    <span class="min-w-0 truncate">{{
                                        row.toName
                                    }}</span>
                                </p>
                            </div>
                            <div class="flex flex-col items-end">
                                <app-amount
                                    [amount]="row.amount"
                                    [currency]="row.currency"
                                    [showCurrency]="false"
                                    [showPlus]="false"
                                    [colored]="false"
                                />
                                <time
                                    [attr.datetime]="row.date"
                                    class="type-label-small whitespace-nowrap text-on-surface-variant"
                                >
                                    {{ row.when }}
                                </time>
                            </div>
                        </button>
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
export class TransferListComponent {
    readonly rows = input.required<TransferRow[]>();
    readonly edit = output<string>();
}
