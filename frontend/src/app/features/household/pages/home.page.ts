import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    LOCALE_ID,
    resource,
} from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DialogService } from '../../../components/dialog/dialog.service';
import { HouseholdCardComponent } from '../dumb_components/household-card/household-card.component';
import { HouseholdService } from '../services/household.service';
import { AccountListComponent } from '../../account/dumb_components/account-list/account-list.component';
import { AccountService } from '../../account/services/account.service';
import { isActiveAccount } from '../../account/account.types';
import { CategoryService } from '../../category/services/category.service';
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
        HouseholdCardComponent,
        AccountListComponent,
        TransactionListComponent,
        MatFabButton,
        MatIcon,
        MatProgressSpinner,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto max-w-lg p-4 pb-24">
            <h1 class="mb-6 text-2xl font-semibold">
                {{ 'home.greeting' | translate: { name: auth.user()?.name } }}
            </h1>
            @if (household.isLoading()) {
                <mat-spinner class="mx-auto" diameter="40" />
            } @else if (household.error()) {
                <p role="alert" class="text-red-700">
                    {{ 'home.noHouseholdFound' | translate }}
                </p>
            } @else if (household.value(); as h) {
                <app-household-card [household]="h" />
                @if (accounts.value()) {
                    <app-account-list
                        [accounts]="activeAccounts()"
                        class="mt-6 block"
                    />
                }
                @if (transactions.isLoading() || accounts.isLoading()) {
                    <mat-spinner class="mx-auto mt-6" diameter="40" />
                } @else if (transactions.value()) {
                    <app-transaction-list
                        [groups]="transactionGroups()"
                        (edit)="openTransactionDialog(h.id, $event)"
                        (remove)="deleteTransaction(h.id, $event)"
                        class="mt-6 block"
                    />
                }
                <!-- Wrapper positions: Material's own position:relative beats layered Tailwind utilities on the button. -->
                <div class="fixed right-4 bottom-20 md:bottom-4">
                    <button
                        matFab
                        type="button"
                        [disabled]="!accounts.value() || !categories.value()"
                        [attr.aria-label]="
                            'transaction.dialog.title' | translate
                        "
                        (click)="openTransactionDialog(h.id)"
                    >
                        <mat-icon>add</mat-icon>
                    </button>
                </div>
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
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

    private readonly locale = inject(LOCALE_ID);

    /** Archived accounts keep their history but take no new transactions. */
    readonly activeAccounts = computed(() =>
        (this.accounts.value() ?? []).filter((a) => isActiveAccount(a)),
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

    constructor(
        protected readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly transactionService: TransactionService,
        private readonly dialogs: DialogService,
    ) {}

    /** With `transactionId` the dialog edits that row instead of creating one. */
    openTransactionDialog(householdId: string, transactionId?: string): void {
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

    async deleteTransaction(
        householdId: string,
        transactionId: string,
    ): Promise<void> {
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
        /** Balance is derived from transactions server-side. */
        this.accounts.reload();
    }
}
