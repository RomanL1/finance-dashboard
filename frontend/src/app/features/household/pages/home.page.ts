import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    LOCALE_ID,
    resource,
} from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DialogService } from '../../../components/dialog/dialog.service';
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
    withEmptyCurrencies,
    type Period,
} from '../../stats/stats.types';
import { TransactionListComponent } from '../../transaction/dumb_components/transaction-list/transaction-list.component';
import { TransactionDialogComponent } from '../../transaction/smart_components/transaction-dialog/transaction-dialog.component';
import { TransactionService } from '../../transaction/services/transaction.service';
import {
    toTransactionGroups,
    type TransactionDialogData,
    type TransactionDto,
} from '../../transaction/transaction.types';

@Component({
    selector: 'app-home-page',
    imports: [
        AccountChipsComponent,
        TransactionListComponent,
        PeriodSwitcherComponent,
        StatsCardComponent,
        SectionHeaderComponent,
        SkeletonComponent,
        MatFabButton,
        MatIcon,
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
                            {{ h.name }}
                        } @else {
                            &nbsp;
                        }
                    </h1>
                    <p class="type-body-medium text-on-surface-variant">
                        {{
                            'home.greeting'
                                | translate: { name: auth.user()?.name }
                        }}
                    </p>
                </header>

                <section class="space-y-3">
                    <app-period-switcher
                        [period]="period()"
                        (periodChange)="setPeriod($event)"
                    />
                    @if (statsCards(); as cards) {
                        <div class="space-y-3" animate.enter="fade-in">
                            @for (card of cards; track card.currency) {
                                <app-stats-card [stats]="card" />
                            }
                        </div>
                    } @else {
                        <app-skeleton variant="stat-card" />
                    }
                </section>

                <section>
                    <app-section-header
                        [title]="'account.chips.title' | translate"
                    />
                    @if (accounts.value()) {
                        <app-account-chips [accounts]="activeAccounts()" />
                    } @else {
                        <app-skeleton variant="chips" />
                    }
                </section>

                <section>
                    <app-section-header
                        [title]="'transaction.list.title' | translate"
                    />
                    @if (transactions.value() && accounts.value()) {
                        <app-transaction-list
                            [groups]="transactionGroups()"
                            (edit)="openTransactionDialog($event)"
                            (remove)="deleteTransaction($event)"
                        />
                    } @else {
                        <app-skeleton variant="list" />
                    }
                </section>

                <!-- Wrapper positions: Material's own position:relative beats layered Tailwind utilities on the button. -->
                <div
                    class="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 touch-none md:bottom-4"
                >
                    <button
                        matFab
                        [extended]="extendedFab"
                        type="button"
                        [disabled]="!canAddTransaction()"
                        [attr.aria-label]="
                            'transaction.dialog.title' | translate
                        "
                        (click)="openTransactionDialog()"
                    >
                        <mat-icon>add</mat-icon>
                        <span class="hidden md:inline">
                            {{ 'home.add' | translate }}
                        </span>
                    </button>
                </div>
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

    readonly transactions = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.transactionService.list(params),
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

    private readonly locale = inject(LOCALE_ID);
    private readonly router = inject(Router);

    /** Archived accounts keep their history but take no new transactions. */
    readonly activeAccounts = computed(() =>
        (this.accounts.value() ?? []).filter((a) => isActiveAccount(a)),
    );

    /** Undefined while loading, so the skeleton shows; then one card per active currency. */
    readonly statsCards = computed(() => {
        const stats = this.stats.value();
        const accounts = this.accounts.value();
        if (!stats || !accounts) return undefined;
        return withEmptyCurrencies(
            stats,
            this.activeAccounts().map((a) => a.currency),
        );
    });

    readonly canAddTransaction = computed(
        () =>
            !!this.household.value() &&
            !!this.accounts.value() &&
            !!this.categories.value(),
    );

    /** Grouped at load time: "today" is not re-evaluated at midnight until the next reload. */
    readonly transactionGroups = computed(() =>
        toTransactionGroups(
            this.transactions.value() ?? [],
            this.accounts.value() ?? [],
            this.categories.value() ?? [],
            new Date(),
            this.locale,
        ),
    );

    protected readonly extendedFab =
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches;

    constructor(
        protected readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly transactionService: TransactionService,
        private readonly statsService: StatsService,
        private readonly dialogs: DialogService,
    ) {}

    /** The period lives in the URL so reload and back/forward keep it. */
    setPeriod(period: Period): void {
        void this.router.navigate([], {
            queryParams: toPeriodParams(period),
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /** With `transactionId` the dialog edits that row instead of creating one. */
    openTransactionDialog(transactionId?: string): void {
        const householdId = this.household.value()?.id;
        if (!householdId) return;
        const ref = this.dialogs.open<
            TransactionDialogComponent,
            TransactionDialogData,
            TransactionDto
        >(TransactionDialogComponent, {
            householdId,
            categories: this.categories.value() ?? [],
            transaction: this.transactions
                .value()
                ?.find((t) => t.id === transactionId),
        });
        ref.afterClosed().subscribe((saved) => {
            if (saved) this.reloadAfterTransactionChange();
        });
    }

    async deleteTransaction(transactionId: string): Promise<void> {
        const householdId = this.household.value()?.id;
        if (!householdId) return;
        const confirmed = await this.dialogs.confirm({
            title: 'transaction.delete.title',
            message: 'transaction.delete.message',
            confirm: 'transaction.delete.confirm',
            cancel: 'transaction.dialog.cancel',
        });
        if (!confirmed) return;
        await this.transactionService.delete(householdId, transactionId);
        this.reloadAfterTransactionChange();
    }

    private reloadAfterTransactionChange(): void {
        this.transactions.reload();
        /** Balance and period sums are derived from transactions server-side. */
        this.accounts.reload();
        this.stats.reload();
    }
}
