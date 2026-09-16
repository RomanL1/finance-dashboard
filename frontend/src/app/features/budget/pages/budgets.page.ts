import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DialogService } from '../../../components/dialog/dialog.service';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { CategoryService } from '../../category/services/category.service';
import { HouseholdService } from '../../household/services/household.service';
import { PeriodSwitcherComponent } from '../../stats/dumb_components/period-switcher/period-switcher.component';
import {
    parsePeriodParams,
    periodOf,
    toPeriodParams,
    type Period,
} from '../../stats/stats.types';
import {
    toBudgetRows,
    toMonthKey,
    type BudgetDialogData,
    type BudgetDialogResult,
    type BudgetRow,
} from '../budget.types';
import { BudgetListComponent } from '../dumb_components/budget-list/budget-list.component';
import { BudgetService } from '../services/budget.service';
import { BudgetDialogComponent } from '../smart_components/budget-dialog/budget-dialog.component';

/** Limits per category for one calendar month. Shares the `?period&start` params with the other tabs, coerced to a month. */
@Component({
    selector: 'app-budgets-page',
    imports: [
        PeriodSwitcherComponent,
        BudgetListComponent,
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
            @if (budgets.error() || categories.error()) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'budget.loadFailed' | translate }}
                </p>
            } @else if (rows(); as list) {
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

    readonly budgets = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId
                ? { householdId, month: this.month() }
                : undefined;
        },
        loader: ({ params }) =>
            this.budgetService.list(params.householdId, params.month),
    });

    /** Undefined while either side loads, so the skeleton shows. */
    readonly rows = computed(() => {
        const categories = this.categories.value();
        const budgets = this.budgets.value();
        return categories && budgets
            ? toBudgetRows(categories, budgets)
            : undefined;
    });

    constructor(
        private readonly householdService: HouseholdService,
        private readonly categoryService: CategoryService,
        private readonly budgetService: BudgetService,
        private readonly dialogs: DialogService,
        private readonly router: Router,
    ) {}

    setPeriod(period: Period): void {
        void this.router.navigate([], {
            queryParams: toPeriodParams(period),
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
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
