import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { ThemeService } from '../../../core/theme/theme.service';
import { HouseholdService } from '../../household/services/household.service';
import { PeriodSwitcherComponent } from '../../stats/dumb_components/period-switcher/period-switcher.component';
import {
    parsePeriodParams,
    periodRange,
    toPeriodParams,
    type Period,
} from '../../stats/stats.types';
import { toCategoryBars } from '../analytics.types';
import { CategoryBarChartComponent } from '../dumb_components/category-bar-chart/category-bar-chart.component';
import { AnalyticsService } from '../services/analytics.service';

@Component({
    selector: 'app-category-stats-page',
    imports: [
        PeriodSwitcherComponent,
        CategoryBarChartComponent,
        SkeletonComponent,
        TranslatePipe,
    ],
    template: `
        <div class="space-y-3">
            <app-period-switcher
                [period]="period()"
                (periodChange)="setPeriod($event)"
            />
            @if (stats.error()) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'analytics.loadFailed' | translate }}
                </p>
            } @else if (bars(); as rows) {
                <div
                    class="rounded-m3-lg bg-surface-low p-4"
                    animate.enter="fade-in"
                >
                    @if (rows.length === 0) {
                        <p class="type-body-medium text-on-surface-variant">
                            {{ 'analytics.empty' | translate }}
                        </p>
                    } @else {
                        <app-category-bar-chart
                            [bars]="rows"
                            [currency]="stats.value()!.currency"
                            [label]="'analytics.chartLabel' | translate"
                            [scheme]="theme.resolved()"
                        />
                    }
                </div>
            } @else {
                <app-skeleton variant="stat-card" />
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryStatsPage {
    /** Query params (`withComponentInputBinding`), shared with the home page: `?period=month&start=2026-09-01`. */
    readonly periodKind = input<string | undefined>(undefined, {
        alias: 'period',
    });
    readonly periodStart = input<string | undefined>(undefined, {
        alias: 'start',
    });

    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    readonly period = computed<Period>(() =>
        parsePeriodParams(this.periodKind(), this.periodStart()),
    );

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

    /** Undefined while loading, so the skeleton shows. */
    readonly bars = computed(() => {
        const stats = this.stats.value();
        return stats
            ? toCategoryBars(
                  stats,
                  this.translate.instant('analytics.uncategorized'),
              )
            : undefined;
    });

    constructor(
        protected readonly theme: ThemeService,
        private readonly householdService: HouseholdService,
        private readonly analytics: AnalyticsService,
        private readonly translate: TranslateService,
        private readonly router: Router,
    ) {}

    setPeriod(period: Period): void {
        void this.router.navigate([], {
            queryParams: toPeriodParams(period),
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }
}
