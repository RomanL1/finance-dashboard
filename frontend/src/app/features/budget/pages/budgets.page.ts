import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    resource,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../components/button/button.component';
import { DialogService } from '../../../components/dialog/dialog.service';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { CategoryService } from '../../category/services/category.service';
import { HouseholdService } from '../../household/services/household.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { PeriodSwitcherComponent } from '../../stats/dumb_components/period-switcher/period-switcher.component';
import {
    parsePeriodParams,
    periodOf,
    periodRange,
    toPeriodParams,
    type Period,
} from '../../stats/stats.types';
import {
    isAutoInheritMonth,
    toBudgetRows,
    toBudgetTotals,
    toMonthKey,
    type BudgetDialogData,
    type BudgetDialogResult,
    type BudgetRow,
} from '../budget.types';
import { BudgetListComponent } from '../dumb_components/budget-list/budget-list.component';
import { BudgetSummaryComponent } from '../dumb_components/budget-summary/budget-summary.component';
import { BudgetService } from '../services/budget.service';
import { BudgetDialogComponent } from '../smart_components/budget-dialog/budget-dialog.component';

/**
 * Limits, spending and what is left per category for one calendar month. Spending comes from the same
 * category statistics as the Categories tab, over the same client-built range, so both tabs agree.
 * Shares the `?period&start` params with the other tabs, coerced to a month.
 *
 * An empty current or next month fills itself with the previous limits on first view (story S4);
 * any other empty month offers a button for it. Copies are independent rows, so the source month stays as it was.
 */
@Component({
    selector: 'app-budgets-page',
    imports: [
        PeriodSwitcherComponent,
        BudgetListComponent,
        BudgetSummaryComponent,
        ButtonComponent,
        SkeletonComponent,
        TranslatePipe,
    ],
    template: `
        <div class="space-y-3">
            <app-period-switcher
                [period]="period()"
                [kinds]="['month']"
                (periodChange)="setPeriod($event)"
            />
            @if (budgets.error() || categories.error() || stats.error()) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'budget.loadFailed' | translate }}
                </p>
            } @else if (rows(); as list) {
                @if (inheritedFrom(); as source) {
                    <p
                        role="status"
                        class="type-body-small text-on-surface-variant"
                    >
                        {{
                            'budget.inherit.taken'
                                | translate: { month: source }
                        }}
                    </p>
                }
                @if (canInherit()) {
                    <div class="flex flex-col items-center gap-2 text-center">
                        <app-button
                            variant="tonal"
                            [disabled]="inheriting()"
                            (clicked)="inherit()"
                        >
                            {{ 'budget.inherit.action' | translate }}
                        </app-button>
                        @if (inheritStatus(); as status) {
                            <p
                                role="status"
                                class="type-body-small"
                                [class.text-error]="status === 'failed'"
                                [class.text-on-surface-variant]="
                                    status === 'nothing'
                                "
                            >
                                {{ 'budget.inherit.' + status | translate }}
                            </p>
                        }
                    </div>
                }
                @if (totals(); as sums) {
                    <div animate.enter="fade-in">
                        <app-budget-summary
                            [totals]="sums"
                            [currency]="household.value()!.baseCurrency"
                        />
                    </div>
                }
                <div
                    class="rounded-m3-lg bg-surface-low px-4 py-2"
                    animate.enter="fade-in"
                >
                    <app-budget-list
                        [rows]="list"
                        [currency]="household.value()!.baseCurrency"
                        (edit)="openDialog($event)"
                    />
                </div>
            } @else {
                <app-skeleton variant="stat-card" />
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetsPage {
    readonly periodKind = input<string | undefined>(undefined, {
        alias: 'period',
    });
    readonly periodStart = input<string | undefined>(undefined, {
        alias: 'start',
    });

    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    /** A week or year from another tab becomes the month containing its start. */
    readonly period = computed<Period>(() =>
        periodOf(
            'month',
            parsePeriodParams(this.periodKind(), this.periodStart()).start,
        ),
    );

    readonly month = computed(() => toMonthKey(this.period().start));

    readonly categories = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.categoryService.list(params),
    });

    /** Loads the month; an empty current or next month is filled from the previous limits first. */
    readonly budgets = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId
                ? { householdId, month: this.month() }
                : undefined;
        },
        loader: ({ params }) =>
            this.budgetService.loadMonth(params.householdId, params.month),
    });

    readonly inheritedFrom = computed(
        () => this.budgets.value()?.inheritedFrom ?? null,
    );

    /** Past, far-future and deliberately emptied months do not fill themselves; offer it while the month is empty. */
    readonly canInherit = computed(() => {
        const loaded = this.budgets.value();
        return (
            !!loaded &&
            loaded.budgets.length === 0 &&
            (!isAutoInheritMonth(this.month()) || loaded.emptied)
        );
    });

    readonly inheriting = signal(false);
    /** Outcome of the last explicit take-over on this page. */
    readonly inheritStatus = signal<'nothing' | 'failed' | null>(null);

    /** Expenses per category over the month; the range is built client-side like on the Categories tab. */
    readonly stats = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId
                ? { householdId, range: periodRange(this.period()) }
                : undefined;
        },
        loader: ({ params }) =>
            this.analytics.getCategoryStats(params.householdId, params.range),
    });

    /** Undefined while any part loads, so the skeleton shows. */
    readonly rows = computed(() => {
        const categories = this.categories.value();
        const budgets = this.budgets.value()?.budgets;
        const stats = this.stats.value();
        return categories && budgets && stats
            ? toBudgetRows(categories, budgets, stats)
            : undefined;
    });

    /** Null until a limit exists, so the summary only shows when it says something. */
    readonly totals = computed(() => {
        const rows = this.rows();
        if (!rows) return null;
        const totals = toBudgetTotals(rows);
        return totals.budgeted > 0 ? totals : null;
    });

    constructor(
        private readonly householdService: HouseholdService,
        private readonly categoryService: CategoryService,
        private readonly budgetService: BudgetService,
        private readonly analytics: AnalyticsService,
        private readonly dialogs: DialogService,
        private readonly router: Router,
    ) {}

    setPeriod(period: Period): void {
        this.inheritStatus.set(null);
        void this.router.navigate([], {
            queryParams: toPeriodParams(period),
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /** Explicit take-over for a month that does not fill itself. Reloads so the hint and rows come from the same load. */
    async inherit(): Promise<void> {
        const household = this.household.value();
        if (!household || this.inheriting()) return;
        this.inheriting.set(true);
        this.inheritStatus.set(null);
        try {
            const copied = await this.budgetService.copyPrevious(
                household.id,
                this.month(),
            );
            if (copied.sourceMonth === null) {
                this.inheritStatus.set('nothing');
            } else {
                this.budgets.set({
                    budgets: copied.budgets,
                    inheritedFrom: copied.sourceMonth,
                    emptied: false,
                });
            }
        } catch {
            this.inheritStatus.set('failed');
        } finally {
            this.inheriting.set(false);
        }
    }

    async openDialog(row: BudgetRow): Promise<void> {
        const household = this.household.value();
        if (!household) return;
        const ref = this.dialogs.open<
            BudgetDialogComponent,
            BudgetDialogData,
            BudgetDialogResult
        >(BudgetDialogComponent, {
            householdId: household.id,
            month: this.month(),
            currency: household.baseCurrency,
            row,
        });
        const result = await firstValueFrom(ref.afterClosed());
        if (result) this.budgets.reload();
    }
}
