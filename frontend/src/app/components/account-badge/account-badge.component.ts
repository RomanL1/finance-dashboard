import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

const HUES = 8;

/** Round numbered badge, colored by the account's number. Same badge everywhere an account is named. */
@Component({
    selector: 'app-account-badge',
    imports: [TranslatePipe],
    template: `
        <span
            class="inline-flex shrink-0 items-center justify-center rounded-full font-medium tabular-nums text-on-account"
            [class]="
                size() === 'sm'
                    ? 'h-5 min-w-5 px-1 text-[11px]'
                    : 'h-7 min-w-7 px-1.5 text-xs'
            "
            [style.background]="'var(--app-account-' + hue() + ')'"
            [attr.aria-label]="
                'account.badge' | translate: { number: number() }
            "
        >
            {{ number() }}
        </span>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBadgeComponent {
    readonly number = input.required<number>();
    /** `sm` inside list rows, `md` in chips and settings. */
    readonly size = input<'sm' | 'md'>('md');

    protected readonly hue = computed(() => ((this.number() - 1) % HUES) + 1);
}
