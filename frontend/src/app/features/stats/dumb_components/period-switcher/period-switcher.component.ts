import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    LOCALE_ID,
    output,
} from '@angular/core';
import {
    MatButtonToggle,
    MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import {
    isSamePeriod,
    periodLabel,
    periodOf,
    shiftPeriod,
    type Period,
    type PeriodKind,
} from '../../stats.types';

/** Week / month / year toggle plus previous / next arrows. Tapping the label jumps back to today. */
@Component({
    selector: 'app-period-switcher',
    imports: [
        MatButtonToggleGroup,
        MatButtonToggle,
        MatIcon,
        IconButtonComponent,
        TranslatePipe,
    ],
    template: `
        <div class="flex flex-col gap-2">
            <mat-button-toggle-group
                class="w-full"
                hideSingleSelectionIndicator
                [value]="period().kind"
                (change)="changeKind($event.value)"
                [attr.aria-label]="'stats.period.label' | translate"
            >
                @for (kind of kinds; track kind) {
                    <mat-button-toggle class="flex-1" [value]="kind">
                        {{ 'stats.period.' + kind | translate }}
                    </mat-button-toggle>
                }
            </mat-button-toggle-group>
            <div class="flex items-center justify-between">
                <app-icon-button
                    [ariaLabel]="'stats.period.previous' | translate"
                    (clicked)="shift(-1)"
                >
                    <mat-icon>chevron_left</mat-icon>
                </app-icon-button>
                <button
                    type="button"
                    class="type-title-medium text-on-surface rounded-full px-3 py-1 hover:bg-surface-high"
                    [disabled]="isCurrent()"
                    [attr.aria-label]="'stats.period.today' | translate"
                    (click)="goToCurrent()"
                >
                    {{ label() }}
                </button>
                <app-icon-button
                    [ariaLabel]="'stats.period.next' | translate"
                    (clicked)="shift(1)"
                >
                    <mat-icon>chevron_right</mat-icon>
                </app-icon-button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSwitcherComponent {
    readonly period = input.required<Period>();
    readonly periodChange = output<Period>();

    protected readonly kinds: PeriodKind[] = ['week', 'month', 'year'];
    private readonly locale = inject(LOCALE_ID);

    protected readonly label = computed(() =>
        periodLabel(this.period(), this.locale),
    );
    protected readonly isCurrent = computed(() =>
        isSamePeriod(this.period(), periodOf(this.period().kind)),
    );

    protected changeKind(kind: PeriodKind): void {
        // Re-anchor on today: switching from "March" to "week" should not land in March.
        this.periodChange.emit(periodOf(kind));
    }

    protected shift(steps: number): void {
        this.periodChange.emit(shiftPeriod(this.period(), steps));
    }

    protected goToCurrent(): void {
        this.periodChange.emit(periodOf(this.period().kind));
    }
}
