import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../../components/amount/amount.component';
import { CategoryAvatarComponent } from '../../../../components/category-avatar/category-avatar.component';
import type { BudgetRow } from '../../budget.types';

/** Every category of the household with its limit for the month. Tapping a row edits it. */
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
                            class="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5 text-left hover:bg-surface-high"
                            (click)="edit.emit(row)"
                        >
                            <app-category-avatar
                                [categoryId]="row.category.id"
                                [name]="row.category.name"
                            />
                            <p class="type-body-large truncate text-on-surface">
                                {{ row.category.name }}
                            </p>
                            @if (row.amount === null) {
                                <span
                                    class="type-body-medium text-on-surface-variant"
                                >
                                    {{ 'budget.list.noLimit' | translate }}
                                </span>
                            } @else {
                                <app-amount
                                    [amount]="row.amount"
                                    [currency]="currency()"
                                    [showPlus]="false"
                                />
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
}
