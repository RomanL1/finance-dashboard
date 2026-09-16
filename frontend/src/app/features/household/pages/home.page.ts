import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AmountComponent } from '../../../components/amount/amount.component';
import { SectionHeaderComponent } from '../../../components/section-header/section-header.component';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { HouseholdService } from '../services/household.service';
import { AccountChipsComponent } from '../../account/dumb_components/account-chips/account-chips.component';
import { AccountService } from '../../account/services/account.service';
import { isActiveAccount } from '../../account/account.types';
import { CategoryService } from '../../category/services/category.service';
import { PeriodSwitcherComponent } from '../../stats/dumb_components/period-switcher/period-switcher.component';
import { StatsCardComponent } from '../../stats/dumb_components/stats-card/stats-card.component';
import { StatsService } from '../../stats/services/stats.service';
import {
    parsePeriodParams,
    periodRange,
    toPeriodParams,
    type Period,
} from '../../stats/stats.types';
import { TransactionHistoryComponent } from '../../transaction/smart_components/transaction-history/transaction-history.component';

@Component({
    selector: 'app-home-page',
    imports: [
        AccountChipsComponent,
        AmountComponent,
        TransactionHistoryComponent,
        PeriodSwitcherComponent,
        StatsCardComponent,
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
                    <app-section-header [title]="'home.overview' | translate" />
                    <app-period-switcher
                        [period]="period()"
                        (periodChange)="setPeriod($event)"
                    />
                    @if (stats.error()) {
                        <p
                            role="alert"
                            class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                        >
                            {{ 'stats.ratesUnavailable' | translate }}
                        </p>
                    } @else if (stats.value(); as card) {
                        <div animate.enter="fade-in">
                            <app-stats-card [stats]="card" />
                        </div>
                    } @else {
                        <app-skeleton variant="stat-card" />
                    }
                </section>

                <section>
                    <app-section-header
                        [title]="'account.chips.title' | translate"
                    />
                    <div class="mb-3">
                        <p class="type-label-small text-on-surface-variant">
                            {{ 'home.totalBalance' | translate }}
                        </p>
                        @if (balance.error()) {
                            <p
                                role="alert"
                                class="type-body-medium text-on-surface-variant"
                            >
                                {{ 'stats.ratesUnavailable' | translate }}
                            </p>
                        } @else if (balance.value(); as total) {
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

    /** Active accounts summed in the base currency; a snapshot at today's rate. */
    readonly balance = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.accountService.householdBalance(params),
    });

    readonly categories = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.categoryService.list(params),
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
            this.statsService.get(params.householdId, params.range),
    });

    /** Archived accounts keep their history but take no new transactions. */
    readonly activeAccounts = computed(() =>
        (this.accounts.value() ?? []).filter((a) => isActiveAccount(a)),
    );

    constructor(
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly statsService: StatsService,
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

    /** Balance and period sums are derived from transactions server-side. */
    reloadAfterTransactionChange(): void {
        this.accounts.reload();
        this.balance.reload();
        this.stats.reload();
    }
}
