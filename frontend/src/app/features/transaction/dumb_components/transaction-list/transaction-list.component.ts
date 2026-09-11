import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
} from '@angular/core';
import { MatRipple } from '@angular/material/core';
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
import { CategoryAvatarComponent } from '../../../../components/category-avatar/category-avatar.component';
import type { TransactionGroup } from '../../transaction.types';

@Component({
    selector: 'app-transaction-list',
    imports: [
        TranslatePipe,
        MatIcon,
        MatMenu,
        MatMenuContent,
        MatMenuItem,
        MatMenuTrigger,
        MatRipple,
        IconButtonComponent,
        AccountBadgeComponent,
        AmountComponent,
        CategoryAvatarComponent,
    ],
    template: `
        @if (groups().length === 0) {
            <div
                class="flex flex-col items-center gap-2 py-10 text-center text-on-surface-variant"
            >
                <mat-icon class="!h-12 !w-12 !text-5xl">receipt_long</mat-icon>
                <p class="type-body-large text-on-surface">
                    {{ 'transaction.list.empty' | translate }}
                </p>
                <p class="type-body-medium">
                    {{ 'transaction.list.emptyHint' | translate }}
                </p>
            </div>
        } @else {
            <div class="space-y-2">
                @for (group of groups(); track groupKey(group)) {
                    <section animate.enter="fade-in">
                        <!-- Sticky offset = shell header height (phone / md+). Keep in sync with shell.page.ts. -->
                        <div class="sticky top-0 z-[1] bg-surface py-2">
                            @if (group.kind === 'upcoming') {
                                <button
                                    type="button"
                                    class="type-label-small flex w-full items-center gap-1 text-on-surface-variant uppercase"
                                    [attr.aria-expanded]="upcomingOpen()"
                                    (click)="upcomingOpen.set(!upcomingOpen())"
                                >
                                    <mat-icon
                                        class="!h-5 !w-5 !text-xl transition-transform duration-150 motion-reduce:transition-none"
                                        [class.rotate-90]="upcomingOpen()"
                                    >
                                        chevron_right
                                    </mat-icon>
                                    {{
                                        'transaction.list.group.upcoming'
                                            | translate
                                                : { count: group.rows.length }
                                    }}
                                </button>
                            } @else {
                                <h3
                                    class="type-label-small text-on-surface-variant uppercase"
                                >
                                    @if (group.kind === 'past') {
                                        {{ group.year }}
                                    } @else {
                                        {{
                                            'transaction.list.group.' +
                                                group.kind | translate
                                        }}
                                    }
                                </h3>
                            }
                        </div>
                        @if (group.kind !== 'upcoming' || upcomingOpen()) {
                            <ul>
                                @for (
                                    row of group.rows;
                                    track row.id;
                                    let last = $last
                                ) {
                                    <li
                                        matRipple
                                        class="relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 py-2.5"
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
                                                class="type-body-medium flex min-w-0 items-center gap-1.5 text-on-surface-variant"
                                            >
                                                @if (
                                                    row.category &&
                                                    row.category !== row.title
                                                ) {
                                                    <span class="truncate">{{
                                                        row.category
                                                    }}</span>
                                                    <span aria-hidden="true"
                                                        >·</span
                                                    >
                                                }
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
                                            <app-amount
                                                [amount]="row.amount"
                                                [currency]="row.currency"
                                            />
                                            <time
                                                [attr.datetime]="row.date"
                                                class="type-label-small whitespace-nowrap text-on-surface-variant"
                                            >
                                                {{ row.when }}
                                            </time>
                                        </div>
                                        <app-icon-button
                                            [matMenuTriggerFor]="menu"
                                            [matMenuTriggerData]="{
                                                id: row.id,
                                            }"
                                            [ariaLabel]="
                                                'transaction.list.actions'
                                                    | translate
                                            "
                                        >
                                            <mat-icon>more_vert</mat-icon>
                                        </app-icon-button>
                                        @if (!last) {
                                            <!-- Inset divider: starts at the text edge, not under the avatar. -->
                                            <span
                                                aria-hidden="true"
                                                class="absolute right-0 bottom-0 left-[3.25rem] border-b border-outline-variant"
                                            ></span>
                                        }
                                    </li>
                                }
                            </ul>
                        }
                    </section>
                }
            </div>
            <!-- One menu for every row; the trigger passes the row id in. -->
            <mat-menu #menu="matMenu">
                <ng-template matMenuContent let-id="id">
                    <button mat-menu-item (click)="edit.emit(id)">
                        <mat-icon>edit</mat-icon>
                        {{ 'transaction.list.edit' | translate }}
                    </button>
                    <button mat-menu-item (click)="remove.emit(id)">
                        <mat-icon>delete</mat-icon>
                        {{ 'transaction.list.delete' | translate }}
                    </button>
                </ng-template>
            </mat-menu>
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
