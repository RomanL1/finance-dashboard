import { DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';

/**
 * The one place money is formatted. Signed minor units in, "−12.50 CHF" out, colored by direction.
 * `row` for list entries, `stat` for the big numbers on stats cards, `inherit` for money inside running text.
 */
@Component({
    selector: 'app-amount',
    imports: [DecimalPipe],
    template: `
        <span
            class="inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums"
            [class.text-income]="colored() && amount() > 0"
            [class.text-expense]="colored() && amount() < 0"
            [class.type-body-large]="emphasis() === 'row'"
            [class.type-title-large]="emphasis() === 'stat'"
            [class.font-medium]="emphasis() === 'stat'"
        >
            <span>{{ sign() }}{{ absolute() / 100 | number: '1.2-2' }}</span>
            <span class="type-label-small text-on-surface-variant">{{
                currency()
            }}</span>
        </span>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmountComponent {
    /** Signed minor units: negative for expenses. */
    readonly amount = input.required<number>();
    readonly currency = input.required<string>();
    readonly emphasis = input<'row' | 'stat' | 'inherit'>('row');
    /** Balances are not a direction: `false` renders zero/positive without a `+`. */
    readonly showPlus = input<boolean>(true);
    /** Limits and sums are not a direction either: `false` keeps the text in the surrounding color. */
    readonly colored = input<boolean>(true);

    protected readonly absolute = computed(() => Math.abs(this.amount()));
    /** Real minus sign (U+2212) so it lines up with the digits. */
    protected readonly sign = computed(() => {
        const value = this.amount();
        if (value < 0) return '−';
        return value > 0 && this.showPlus() ? '+' : '';
    });
}
