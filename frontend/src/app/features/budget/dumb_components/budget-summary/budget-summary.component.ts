import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../../components/amount/amount.component';
import type { BudgetTotals } from '../../budget.types';

/** Month totals over the budgeted categories: limit, spent and what is left, with the same bar as the rows. */
@Component({
    selector: 'app-budget-summary',
    imports: [AmountComponent, TranslatePipe],
    template: `
        <section
            class="rounded-m3-lg bg-surface-low p-4"
            [attr.aria-label]="'budget.summary.label' | translate"
        >
            <p class="type-label-large mb-3 text-on-surface-variant">
                {{
                    'budget.summary.budgeted'
                        | translate: { count: totals().budgeted }
                }}
            </p>
            <dl class="grid grid-cols-3 gap-2">
                <div>
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'budget.summary.limit' | translate }}
                    </dt>
                    <dd class="type-title-medium text-on-surface">
                        <app-amount
                            [amount]="totals().limit"
                            [currency]="''"
                            [showPlus]="false"
                            [colored]="false"
                        />
                    </dd>
                </div>
                <div>
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'budget.summary.spent' | translate }}
                    </dt>
                    <dd class="type-title-medium text-expense">
                        <app-amount
                            [amount]="-totals().spent"
                            [currency]="''"
                        />
                    </dd>
                </div>
                <div class="text-right">
                    <dt class="type-label-small text-on-surface-variant">
                        {{
                            (over()
                                ? 'budget.summary.over'
                                : 'budget.summary.left'
                            ) | translate
                        }}
                    </dt>
                    <dd>
                        <app-amount
                            [amount]="totals().remaining"
                            [currency]="currency()"
                            [showPlus]="false"
                            [colored]="over()"
                            emphasis="stat"
                        />
                    </dd>
                </div>
            </dl>
            <div
                class="mt-3 h-1 overflow-hidden rounded-full bg-surface-highest"
                role="img"
                [attr.aria-label]="
                    'budget.list.usedRatio' | translate: { percent: percent() }
                "
            >
                <div
                    class="h-full rounded-full transition-[width] duration-300"
                    [class.bg-primary]="!over()"
                    [class.bg-expense]="over()"
                    [style.width.%]="ratio() * 100"
                ></div>
            </div>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetSummaryComponent {
    readonly totals = input.required<BudgetTotals>();
    readonly currency = input.required<string>();

    protected readonly over = computed(() => this.totals().remaining < 0);

    /** Spent share of the total limit, clamped to [0, 1]; a zero total counts as full once anything is spent. */
    protected readonly ratio = computed(() => {
        const { limit, spent } = this.totals();
        if (limit === 0) return spent > 0 ? 1 : 0;
        return Math.min(spent / limit, 1);
    });
    protected readonly percent = computed(() => Math.round(this.ratio() * 100));
}
