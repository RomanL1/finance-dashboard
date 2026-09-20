import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../../components/amount/amount.component';
import { toSafeToSpendShares, type SafeToSpend } from '../../budget.types';

/**
 * The one number for the month, named after what it accounts for: income, minus what was spent, minus
 * what the budgets still hold. The bar splits the income into those parts; the cells are its legend.
 */
@Component({
    selector: 'app-safe-to-spend-card',
    imports: [AmountComponent, TranslatePipe],
    template: `
        <section
            class="rounded-m3-lg bg-surface-low p-4"
            [attr.aria-label]="'budget.safe.title' | translate"
        >
            <p class="type-label-large text-on-surface-variant">
                {{ 'budget.safe.title' | translate }}
            </p>
            <p class="mt-1">
                <app-amount
                    [amount]="value().amount"
                    [currency]="currency()"
                    [showPlus]="false"
                    emphasis="stat"
                />
            </p>
            <p class="type-body-small mb-3 text-on-surface-variant">
                {{ 'budget.safe.formula' | translate }}
            </p>
            <dl class="grid grid-cols-3 gap-2">
                <div>
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'stats.income' | translate }}
                    </dt>
                    <dd class="type-title-medium text-on-surface">
                        <app-amount
                            [amount]="value().income"
                            [currency]="''"
                            [showPlus]="false"
                            [colored]="false"
                        />
                    </dd>
                </div>
                <div>
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'stats.expenses' | translate }}
                    </dt>
                    <dd class="type-title-medium text-expense">
                        <app-amount
                            [amount]="-value().expenses"
                            [currency]="''"
                        />
                    </dd>
                </div>
                <div class="text-right">
                    <dt class="type-label-small text-on-surface-variant">
                        {{ 'budget.safe.reserved' | translate }}
                    </dt>
                    <dd class="type-title-medium text-primary">
                        <app-amount
                            [amount]="-value().reserved"
                            [currency]="''"
                            [colored]="false"
                        />
                    </dd>
                </div>
            </dl>
            <div
                class="mt-3 flex h-1 overflow-hidden rounded-full bg-surface-highest"
                role="img"
                [attr.aria-label]="
                    'budget.safe.barLabel' | translate: percents()
                "
            >
                <div
                    class="h-full bg-expense transition-[width] duration-300"
                    [style.width.%]="shares().expenses * 100"
                ></div>
                <div
                    class="h-full bg-primary transition-[width] duration-300"
                    [style.width.%]="shares().reserved * 100"
                ></div>
                <div
                    class="h-full bg-income transition-[width] duration-300"
                    [style.width.%]="shares().free * 100"
                ></div>
            </div>
            @if (!hasLimits()) {
                <p class="type-body-small mt-3 text-on-surface-variant">
                    {{ 'budget.safe.noLimits' | translate }}
                </p>
            }
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafeToSpendCardComponent {
    readonly value = input.required<SafeToSpend>();
    readonly currency = input.required<string>();
    /** Without budgets nothing is held back and the number equals the net; say so. */
    readonly hasLimits = input.required<boolean>();

    protected readonly shares = computed(() =>
        toSafeToSpendShares(this.value()),
    );
    protected readonly percents = computed(() => {
        const { expenses, reserved, free } = this.shares();
        return {
            expenses: Math.round(expenses * 100),
            reserved: Math.round(reserved * 100),
            free: Math.round(free * 100),
        };
    });
}
