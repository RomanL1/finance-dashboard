import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../../components/amount/amount.component';
import type { CurrencyStatsDto } from '../../stats.types';

/** Income / expenses / net for the period, plus a thin bar showing how much of the income was spent. */
@Component({
    selector: 'app-stats-card',
    imports: [AmountComponent, TranslatePipe],
    template: `
        <section
            class="rounded-m3-lg bg-surface-low p-4"
            [attr.aria-label]="stats().currency"
        >
            <p class="type-label-large mb-3 text-on-surface-variant">
                {{ stats().currency }}
            </p>
            <dl class="grid grid-cols-3 gap-2">
                <div>
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'stats.income' | translate }}
                    </dt>
                    <dd class="type-title-medium text-income">
                        <app-amount
                            [amount]="stats().income"
                            [currency]="''"
                            [showPlus]="false"
                        />
                    </dd>
                </div>
                <div>
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'stats.expenses' | translate }}
                    </dt>
                    <dd class="type-title-medium text-expense">
                        <app-amount
                            [amount]="-stats().expenses"
                            [currency]="''"
                        />
                    </dd>
                </div>
                <div class="text-right">
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'stats.net' | translate }}
                    </dt>
                    <dd>
                        <app-amount
                            [amount]="stats().net"
                            [currency]="stats().currency"
                            emphasis="stat"
                        />
                    </dd>
                </div>
            </dl>
            @if (ratio() !== null) {
                <div
                    class="mt-3 h-1 overflow-hidden rounded-full bg-income-container"
                    role="img"
                    [attr.aria-label]="
                        'stats.spentRatio' | translate: { percent: percent() }
                    "
                >
                    <div
                        class="h-full rounded-full bg-expense transition-[width] duration-300"
                        [style.width.%]="ratio()! * 100"
                    ></div>
                </div>
            }
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardComponent {
    readonly stats = input.required<CurrencyStatsDto>();

    /** Expenses relative to the larger of the two; null when there is nothing to show. */
    protected readonly ratio = computed(() => {
        const { income, expenses } = this.stats();
        const max = Math.max(income, expenses);
        return max === 0 ? null : expenses / max;
    });
    protected readonly percent = computed(() =>
        Math.round((this.ratio() ?? 0) * 100),
    );
}
