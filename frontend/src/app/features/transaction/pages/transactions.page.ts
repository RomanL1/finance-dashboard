import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { AccountService } from '../../account/services/account.service';
import { CategoryService } from '../../category/services/category.service';
import { HouseholdService } from '../../household/services/household.service';
import { TransactionHistoryComponent } from '../smart_components/transaction-history/transaction-history.component';

/** Full, filterable, paged history. Balances and stats live on the home page, so nothing to refresh here. */
@Component({
    selector: 'app-transactions-page',
    imports: [TransactionHistoryComponent, SkeletonComponent, TranslatePipe],
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
                        {{ 'transaction.page.title' | translate }}
                    </h1>
                </header>
                @if (
                    household.value() && accounts.value() && categories.value()
                ) {
                    <app-transaction-history
                        [householdId]="household.value()!.id"
                        [accounts]="accounts.value()!"
                        [categories]="categories.value()!"
                    />
                } @else {
                    <app-skeleton variant="list" />
                }
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
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

    constructor(
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
    ) {}
}
