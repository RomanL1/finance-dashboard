import {
    ChangeDetectionStrategy,
    Component,
    computed,
    resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { ButtonComponent } from '../../../components/button/button.component';
import { DialogService } from '../../../components/dialog/dialog.service';
import { HouseholdCardComponent } from '../dumb_components/household-card/household-card.component';
import { HouseholdService } from '../services/household.service';
import { AccountListComponent } from '../../account/dumb_components/account-list/account-list.component';
import { AccountService } from '../../account/services/account.service';
import { CategoryService } from '../../category/services/category.service';
import { TransactionListComponent } from '../../transaction/dumb_components/transaction-list/transaction-list.component';
import { TransactionDialogComponent } from '../../transaction/smart_components/transaction-dialog/transaction-dialog.component';
import { TransactionService } from '../../transaction/services/transaction.service';
import {
    toTransactionRows,
    type TransactionDialogData,
    type TransactionDto,
} from '../../transaction/transaction.types';

@Component({
    selector: 'app-home-page',
    imports: [
        ButtonComponent,
        HouseholdCardComponent,
        AccountListComponent,
        TransactionListComponent,
        MatFabButton,
        MatIcon,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto mt-16 max-w-lg p-4 pb-24">
            <header class="mb-6 flex items-center justify-between">
                <h1 class="text-2xl font-semibold">
                    {{
                        'home.greeting' | translate: { name: auth.user()?.name }
                    }}
                </h1>
                <app-button
                    type="button"
                    variant="outlined"
                    (clicked)="signOut()"
                >
                    {{ 'home.signOut' | translate }}
                </app-button>
            </header>
            @if (household.isLoading()) {
                <p>{{ 'home.loadingHousehold' | translate }}</p>
            } @else if (household.error()) {
                <p role="alert" class="text-red-700">
                    {{ 'home.noHouseholdFound' | translate }}
                </p>
            } @else if (household.value(); as h) {
                <app-household-card [household]="h" />
                @if (accounts.value(); as accts) {
                    <app-account-list [accounts]="accts" class="mt-6 block" />
                }
                @if (transactions.value()) {
                    <app-transaction-list
                        [rows]="transactionRows()"
                        class="mt-6 block"
                    />
                }
                <!-- Wrapper positions: Material's own position:relative beats layered Tailwind utilities on the button. -->
                <div class="fixed right-4 bottom-4">
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

    readonly transactionRows = computed(() =>
        toTransactionRows(
            this.transactions.value() ?? [],
            this.accounts.value() ?? [],
            this.categories.value() ?? [],
        ),
    );

    constructor(
        protected readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly transactionService: TransactionService,
        private readonly dialogs: DialogService,
        private readonly router: Router,
    ) {}

    openTransactionDialog(householdId: string): void {
        const ref = this.dialogs.open<
            TransactionDialogComponent,
            TransactionDialogData,
            TransactionDto
        >(TransactionDialogComponent, {
            householdId,
            accounts: this.accounts.value() ?? [],
            categories: this.categories.value() ?? [],
        });
        ref.afterClosed().subscribe((created) => {
            if (!created) return;
            this.transactions.reload();
            /** Balance changed server-side. */
            this.accounts.reload();
        });
    }

    async signOut(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/' + APP_PATHS.LOGIN]);
    }
}
