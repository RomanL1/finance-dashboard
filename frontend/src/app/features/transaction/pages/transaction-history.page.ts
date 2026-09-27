import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { AccountService } from '../../account/services/account.service';
import { CategoryService } from '../../category/services/category.service';
import { HouseholdService } from '../../household/services/household.service';
import { TransactionHistoryComponent } from '../smart_components/transaction-history/transaction-history.component';

/** Full, filterable, paged history (tab of the transactions page). Balances and stats live on the home page, so nothing to refresh here. */
@Component({
    selector: 'app-transaction-history-page',
    imports: [TransactionHistoryComponent, SkeletonComponent, TranslatePipe],
    template: `
        <div class="pb-20">
            @if (household.error()) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'home.noHouseholdFound' | translate }}
                </p>
            } @else {
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
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionHistoryPage {
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
