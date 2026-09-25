import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../../components/amount/amount.component';
import { CategoryAvatarComponent } from '../../../../components/category-avatar/category-avatar.component';
import {
    budgetRatio,
    isLowBudget,
    isOverBudget,
    isUsedUp,
    type BudgetRow,
} from '../../budget.types';

/**
 * Every category of the household with its limit, what was spent and what is left for the month.
 * Budgeted rows carry a bar that turns amber when less than 20% is left, black when the limit is met
 * exactly and to the expense color once the limit is exceeded. Tapping a row edits it.
 */
@Component({
    selector: 'app-budget-list',
    imports: [TranslatePipe, AmountComponent, CategoryAvatarComponent],
    template: `
        @if (rows().length === 0) {
            <p class="type-body-medium text-on-surface-variant">
                {{ 'budget.list.empty' | translate }}
            </p>
        } @else {
            <ul>
                @for (row of rows(); track row.category.id; let last = $last) {
                    <li class="relative">
                        <button
                            type="button"
                            class="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 py-2.5 text-left hover:bg-surface-high"
                            (click)="edit.emit(row)"
                        >
                            <app-category-avatar
                                [categoryId]="row.category.id"
                                [name]="row.category.name"
                            />
                            <span class="min-w-0">
                                <span
                                    class="type-body-large block truncate text-on-surface"
                                >
                                    {{ row.category.name }}
                                </span>
                                <span
                                    class="type-body-small block text-on-surface-variant"
                                >
                                    {{ 'budget.list.spent' | translate }}
                                    <app-amount
                                        [amount]="row.spent"
                                        [currency]="
                                            row.amount === null
                                                ? currency()
                                                : ''
                                        "
                                        [showPlus]="false"
                                        [colored]="false"
                                        emphasis="inherit"
                                    />
                                    @if (row.amount !== null) {
                                        /
                                        <app-amount
                                            [amount]="row.amount"
                                            [currency]="currency()"
                                            [showPlus]="false"
                                            [colored]="false"
                                            emphasis="inherit"
                                        />
                                    }
                                </span>
                            </span>
                            @if (row.remaining === null) {
                                <span
                                    class="type-body-medium text-on-surface-variant"
                                >
                                    {{ 'budget.list.noLimit' | translate }}
                                </span>
                            } @else if (over(row)) {
                                <span class="text-right">
                                    <span
                                        class="type-label-small block text-expense"
                                    >
                                        {{ 'budget.list.over' | translate }}
                                    </span>
                                    <app-amount
                                        [amount]="row.remaining"
                                        [currency]="currency()"
                                    />
                                </span>
                            } @else {
                                <span class="text-right">
                                    <span
                                        class="type-label-small block"
                                        [class.text-on-surface-variant]="
                                            !low(row) && !usedUp(row)
                                        "
                                        [class.text-warning]="low(row)"
                                        [class.text-used-up]="usedUp(row)"
                                    >
                                        {{
                                            (usedUp(row)
                                                ? 'budget.list.usedUp'
                                                : low(row)
                                                  ? 'budget.list.low'
                                                  : 'budget.list.left'
                                            ) | translate
                                        }}
                                    </span>
                                    <app-amount
                                        [amount]="row.remaining"
                                        [currency]="currency()"
                                        [showPlus]="false"
                                        [colored]="false"
                                    />
                                </span>
                            }
                            @let share = ratio(row);
                            @if (share !== null) {
                                <span
                                    class="col-span-full h-1 overflow-hidden rounded-full bg-surface-highest"
                                    role="img"
                                    [attr.aria-label]="
                                        'budget.list.usedRatio'
                                            | translate
                                                : { percent: percent(share) }
                                    "
                                >
                                    <span
                                        class="block h-full rounded-full transition-[width] duration-300"
                                        [class.bg-primary]="
                                            !over(row) &&
                                            !low(row) &&
                                            !usedUp(row)
                                        "
                                        [class.bg-warning]="low(row)"
                                        [class.bg-used-up]="usedUp(row)"
                                        [class.bg-expense]="over(row)"
                                        [style.width.%]="share * 100"
                                    ></span>
                                </span>
                            }
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
export class BudgetListComponent {
    readonly rows = input.required<BudgetRow[]>();
    readonly currency = input.required<string>();
    readonly edit = output<BudgetRow>();

    /** Null hides the bar; a zero share still renders an empty track. */
    protected ratio(row: BudgetRow): number | null {
        return budgetRatio(row);
    }

    protected over(row: BudgetRow): boolean {
        return isOverBudget(row);
    }

    protected usedUp(row: BudgetRow): boolean {
        return isUsedUp(row);
    }

    protected low(row: BudgetRow): boolean {
        return isLowBudget(row);
    }

    protected percent(share: number): number {
        return Math.round(share * 100);
    }
}
