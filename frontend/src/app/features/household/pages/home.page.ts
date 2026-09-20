import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    resource,
    signal,
} from '@angular/core';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../components/amount/amount.component';
import { SectionHeaderComponent } from '../../../components/section-header/section-header.component';
import { ANALYTICS_PATHS, APP_PATHS } from '../../../config/paths.config';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { HouseholdService } from '../services/household.service';
import { AccountChipsComponent } from '../../account/dumb_components/account-chips/account-chips.component';
import { AccountService } from '../../account/services/account.service';
import { isActiveAccount } from '../../account/account.types';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import {
    isOverBudget,
    toBudgetRows,
    toBudgetTotals,
    toMonthKey,
    toSafeToSpend,
} from '../../budget/budget.types';
import { BudgetSummaryComponent } from '../../budget/dumb_components/budget-summary/budget-summary.component';
import { SafeToSpendCardComponent } from '../../budget/dumb_components/safe-to-spend-card/safe-to-spend-card.component';
import { BudgetService } from '../../budget/services/budget.service';
import { CategoryService } from '../../category/services/category.service';
import { PeriodSwitcherComponent } from '../../stats/dumb_components/period-switcher/period-switcher.component';
import { StatsCardComponent } from '../../stats/dumb_components/stats-card/stats-card.component';
import { StatsService } from '../../stats/services/stats.service';
import {
    parsePeriodParams,
    periodOf,
    periodRange,
    toPeriodParams,
    type Period,
    type PeriodKind,
} from '../../stats/stats.types';
import { TransactionHistoryComponent } from '../../transaction/smart_components/transaction-history/transaction-history.component';

type HomeView = 'overview' | 'budget';

const VIEW_KEY = 'home.view';

function readView(): HomeView {
    try {
        return localStorage.getItem(VIEW_KEY) === 'budget'
            ? 'budget'
            : 'overview';
    } catch {
        return 'overview';
    }
}

@Component({
    selector: 'app-home-page',
    imports: [
        AccountChipsComponent,
        AmountComponent,
        TransactionHistoryComponent,
        PeriodSwitcherComponent,
        StatsCardComponent,
        SafeToSpendCardComponent,
        MatTabNav,
        MatTabLink,
        MatTabNavPanel,
        RouterLink,
        BudgetSummaryComponent,
        SectionHeaderComponent,
        SkeletonComponent,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto max-w-lg space-y-6 p-4 pb-28">
            @if (household.error()) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'home.noHouseholdFound' | translate }}
                </p>
            } @else {
                <header>
                    <h1 class="type-headline-small text-on-surface">
                        @if (household.value(); as h) {
                            {{ 'home.household' | translate: { name: h.name } }}
                        } @else {
                            &nbsp;
                        }
                    </h1>
                </header>

                <section class="space-y-3">
                    <!-- Same tab row as under Analytics, but the choice is view state, not a route. -->
                    <nav
                        mat-tab-nav-bar
                        [tabPanel]="viewPanel"
                        [mat-stretch-tabs]="true"
                        [attr.aria-label]="'home.tabs.label' | translate"
                    >
                        <button
                            type="button"
                            mat-tab-link
                            [active]="view() === 'overview'"
                            (click)="setView('overview')"
                        >
                            {{ 'home.overview' | translate }}
                        </button>
                        <button
                            type="button"
                            mat-tab-link
                            [active]="view() === 'budget'"
                            (click)="setView('budget')"
                        >
                            {{ 'home.tabs.budget' | translate }}
                        </button>
                    </nav>
                    <mat-tab-nav-panel #viewPanel class="flex flex-col gap-3">
                        <app-period-switcher
                            [period]="period()"
                            [kinds]="view() === 'budget' ? monthOnly : allKinds"
                            (periodChange)="setPeriod($event)"
                        />
                        @if (
                            stats.error() ||
                            (view() === 'budget' &&
                                (budgets.error() || categoryStats.error()))
                        ) {
                            <p
                                role="alert"
                                class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                            >
                                {{ 'stats.loadFailed' | translate }}
                            </p>
                        } @else if (view() === 'budget') {
                            @if (safeToSpend(); as safe) {
                                <div
                                    class="flex flex-col gap-3"
                                    animate.enter="fade-in"
                                >
                                    <app-safe-to-spend-card
                                        [value]="safe"
                                        [currency]="
                                            household.value()!.baseCurrency
                                        "
                                        [hasLimits]="hasLimits()"
                                    />
                                    @if (budgetTotals(); as sums) {
                                        <app-budget-summary
                                            [totals]="sums"
                                            [currency]="
                                                household.value()!.baseCurrency
                                            "
                                        />
                                    }
                                    <div
                                        class="flex items-center justify-between gap-3"
                                    >
                                        <p
                                            class="type-body-small"
                                            [class.text-expense]="
                                                overCount() > 0
                                            "
                                            [class.text-on-surface-variant]="
                                                overCount() === 0
                                            "
                                        >
                                            @if (hasLimits()) {
                                                {{
                                                    'budget.safe.overCount'
                                                        | translate
                                                            : {
                                                                  count: overCount(),
                                                              }
                                                }}
                                            }
                                        </p>
                                        <a
                                            class="type-label-large text-primary"
                                            [routerLink]="budgetsLink"
                                            [queryParams]="periodParams()"
                                        >
                                            {{
                                                'budget.safe.allBudgets'
                                                    | translate
                                            }}
                                        </a>
                                    </div>
                                </div>
                            } @else {
                                <app-skeleton variant="stat-card" />
                            }
                        } @else if (stats.value(); as card) {
                            <div animate.enter="fade-in">
                                <app-stats-card [stats]="card" />
                            </div>
                        } @else {
                            <app-skeleton variant="stat-card" />
                        }
                    </mat-tab-nav-panel>
                </section>

                <section>
                    <app-section-header
                        [title]="'account.chips.title' | translate"
                    />
                    <div class="mb-3">
                        <p class="type-label-small text-on-surface-variant">
                            {{ 'home.totalBalance' | translate }}
                        </p>
                        @if (totalBalance(); as total) {
                            <div animate.enter="fade-in">
                                <app-amount
                                    [amount]="total.amount"
                                    [currency]="total.currency"
                                    [showPlus]="false"
                                    emphasis="stat"
                                />
                            </div>
                        } @else {
                            <app-skeleton variant="stat" />
                        }
                    </div>
                    @if (accounts.value()) {
                        <app-account-chips [accounts]="activeAccounts()" />
                    } @else {
                        <app-skeleton variant="chips" />
                    }
                </section>

                @if (
                    household.value() && accounts.value() && categories.value()
                ) {
                    <app-transaction-history
                        mode="recent"
                        [householdId]="household.value()!.id"
                        [accounts]="accounts.value()!"
                        [categories]="categories.value()!"
                        (changed)="reloadAfterTransactionChange()"
                    />
                } @else {
                    <app-skeleton variant="list" />
                }
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
    /** Query params (`withComponentInputBinding`): `?period=month&start=2026-09-01`. */
    readonly periodKind = input<string | undefined>(undefined, {
        alias: 'period',
    });
    readonly periodStart = input<string | undefined>(undefined, {
        alias: 'start',
    });

    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    readonly accounts = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.accountService.list(params),
    });

    readonly categories = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.categoryService.list(params),
    });

    /** Which tab of the top section shows. View state, remembered per browser, not part of the URL. */
    readonly view = signal<HomeView>(readView());

    protected readonly allKinds: PeriodKind[] = ['week', 'month', 'year'];
    protected readonly monthOnly: PeriodKind[] = ['month'];
    protected readonly budgetsLink = [
        '/',
        APP_PATHS.ANALYTICS,
        ANALYTICS_PATHS.BUDGETS,
    ];

    /** Budgets are per month: on that tab a week or year becomes the month containing its start. */
    readonly period = computed<Period>(() => {
        const period = parsePeriodParams(this.periodKind(), this.periodStart());
        return this.view() === 'budget'
            ? periodOf('month', period.start)
            : period;
    });

    readonly periodParams = computed(() => toPeriodParams(this.period()));

    readonly stats = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId
                ? { householdId, range: periodRange(this.period()) }
                : undefined;
        },
        loader: ({ params }) =>
            this.statsService.get(params.householdId, params.range),
    });

    /** Only loaded on the budget tab. Fills an empty current month like the budgets tab does. */
    readonly budgets = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId && this.view() === 'budget'
                ? { householdId, month: toMonthKey(this.period().start) }
                : undefined;
        },
        loader: ({ params }) =>
            this.budgetService.loadMonth(params.householdId, params.month),
    });

    readonly categoryStats = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId && this.view() === 'budget'
                ? { householdId, range: periodRange(this.period()) }
                : undefined;
        },
        loader: ({ params }) =>
            this.analytics.getCategoryStats(params.householdId, params.range),
    });

    /** Undefined while any part loads, so the skeleton shows. */
    readonly budgetRows = computed(() => {
        const categories = this.categories.value();
        const budgets = this.budgets.value()?.budgets;
        const categoryStats = this.categoryStats.value();
        return categories && budgets && categoryStats
            ? toBudgetRows(categories, budgets, categoryStats)
            : undefined;
    });

    readonly safeToSpend = computed(() => {
        const stats = this.stats.value();
        const rows = this.budgetRows();
        return stats && rows ? toSafeToSpend(stats, rows) : undefined;
    });

    /** Null until a limit exists, like on the budgets tab. */
    readonly budgetTotals = computed(() => {
        const totals = toBudgetTotals(this.budgetRows() ?? []);
        return totals.budgeted > 0 ? totals : null;
    });

    readonly overCount = computed(
        () => (this.budgetRows() ?? []).filter(isOverBudget).length,
    );

    readonly hasLimits = computed(
        () => (this.budgets.value()?.budgets.length ?? 0) > 0,
    );

    /** Archived accounts keep their history but take no new transactions. */
    readonly activeAccounts = computed(() =>
        (this.accounts.value() ?? []).filter((a) => isActiveAccount(a)),
    );

    /** One currency per household, so the total is a plain sum of the active balances. Undefined while loading. */
    readonly totalBalance = computed(() => {
        const household = this.household.value();
        if (!household || !this.accounts.value()) return undefined;
        return {
            currency: household.baseCurrency,
            amount: this.activeAccounts().reduce((sum, a) => sum + a.amount, 0),
        };
    });

    constructor(
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly statsService: StatsService,
        private readonly budgetService: BudgetService,
        private readonly analytics: AnalyticsService,
        private readonly router: Router,
    ) {}

    /** The period lives in the URL so reload and back/forward keep it. */
    setPeriod(period: Period): void {
        void this.router.navigate([], {
            queryParams: toPeriodParams(period),
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    setView(view: HomeView): void {
        this.view.set(view);
        try {
            localStorage.setItem(VIEW_KEY, view);
        } catch {
            // Private mode or blocked storage: the choice just does not survive a reload.
        }
    }

    /** Balance and period sums are derived from transactions server-side. */
    reloadAfterTransactionChange(): void {
        this.accounts.reload();
        this.stats.reload();
        this.categoryStats.reload();
    }
}
