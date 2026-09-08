import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { ButtonComponent } from '../../../components/button/button.component';
import { DialogService } from '../../../components/dialog/dialog.service';
import { HouseholdService } from '../../household/services/household.service';
import { AccountService } from '../../account/services/account.service';
import { AccountManageListComponent } from '../../account/dumb_components/account-manage-list/account-manage-list.component';
import { AccountDialogComponent } from '../../account/smart_components/account-dialog/account-dialog.component';
import type {
    AccountDialogData,
    AccountDto,
    UpdateAccountDto,
} from '../../account/account.types';
import { CategoryService } from '../../category/services/category.service';
import { CategoryManageListComponent } from '../../category/dumb_components/category-manage-list/category-manage-list.component';
import { CategoryDeleteDialogComponent } from '../../category/dumb_components/category-delete-dialog/category-delete-dialog.component';
import { CategoryDialogComponent } from '../../category/smart_components/category-dialog/category-dialog.component';
import type {
    CategoryDeleteChoice,
    CategoryDeleteDialogData,
    CategoryDialogData,
    CategoryDto,
} from '../../category/category.types';

@Component({
    selector: 'app-settings-page',
    imports: [
        ButtonComponent,
        AccountManageListComponent,
        CategoryManageListComponent,
        MatProgressSpinner,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto max-w-lg p-4">
            <header class="mb-6 flex items-center justify-between">
                <h1 class="text-2xl font-semibold">
                    {{ 'settings.title' | translate }}
                </h1>
                <app-button
                    type="button"
                    variant="outlined"
                    (clicked)="signOut()"
                >
                    {{ 'settings.signOut' | translate }}
                </app-button>
            </header>
            @if (
                household.isLoading() ||
                accounts.isLoading() ||
                categories.isLoading()
            ) {
                <mat-spinner class="mx-auto" diameter="40" />
            } @else if (household.value(); as h) {
                <section>
                    <div class="mb-2 flex items-center justify-between">
                        <h2 class="text-lg font-semibold">
                            {{ 'settings.accounts.title' | translate }}
                        </h2>
                        <app-button
                            type="button"
                            variant="tonal"
                            (clicked)="openAccountDialog(h.id)"
                        >
                            {{ 'settings.accounts.add' | translate }}
                        </app-button>
                    </div>
                    @if (accounts.value(); as accts) {
                        <app-account-manage-list
                            [accounts]="accts"
                            (edit)="openAccountDialog(h.id, $event)"
                            (archive)="archive(h.id, $event, true)"
                            (unarchive)="archive(h.id, $event, false)"
                            (remove)="deleteAccount(h.id, $event)"
                        />
                    }
                </section>
                <section class="mt-8">
                    <div class="mb-2 flex items-center justify-between">
                        <h2 class="text-lg font-semibold">
                            {{ 'settings.categories.title' | translate }}
                        </h2>
                        <app-button
                            type="button"
                            variant="tonal"
                            (clicked)="openCategoryDialog(h.id)"
                        >
                            {{ 'settings.categories.add' | translate }}
                        </app-button>
                    </div>
                    @if (categories.value(); as cats) {
                        <app-category-manage-list
                            [categories]="cats"
                            (edit)="openCategoryDialog(h.id, $event)"
                            (remove)="deleteCategory(h.id, $event)"
                        />
                    }
                </section>
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
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
        private readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly dialogs: DialogService,
        private readonly router: Router,
    ) {}

    openAccountDialog(householdId: string, accountId?: string): void {
        const ref = this.dialogs.open<
            AccountDialogComponent,
            AccountDialogData,
            AccountDto
        >(AccountDialogComponent, {
            householdId,
            account: this.find(accountId),
        });
        ref.afterClosed().subscribe((saved) => {
            if (saved) this.accounts.reload();
        });
    }

    /** Archive = today. Unarchive = null. Other fields sent back unchanged (full replace). */
    async archive(
        householdId: string,
        accountId: string,
        archived: boolean,
    ): Promise<void> {
        const account = this.find(accountId);
        if (!account) return;
        if (archived) {
            const confirmed = await this.dialogs.confirm({
                title: 'account.archive.title',
                message: 'account.archive.message',
                confirm: 'account.archive.confirm',
                cancel: 'account.dialog.cancel',
            });
            if (!confirmed) return;
        }
        await this.accountService.update(householdId, accountId, {
            description: account.description,
            /** Response type is plain string; the request enum is narrower. Server validates. */
            currency: account.currency as UpdateAccountDto['currency'],
            startDate: account.startDate,
            archivedAt: archived ? new Date().toISOString() : null,
        });
        this.accounts.reload();
    }

    /** Cascades server-side: the confirm text says every transaction goes too. */
    async deleteAccount(householdId: string, accountId: string): Promise<void> {
        const confirmed = await this.dialogs.confirm({
            title: 'account.delete.title',
            message: 'account.delete.message',
            confirm: 'account.delete.confirm',
            cancel: 'account.dialog.cancel',
        });
        if (!confirmed) return;
        await this.accountService.delete(householdId, accountId);
        this.accounts.reload();
    }

    openCategoryDialog(householdId: string, categoryId?: string): void {
        const ref = this.dialogs.open<
            CategoryDialogComponent,
            CategoryDialogData,
            CategoryDto
        >(CategoryDialogComponent, {
            householdId,
            category: this.findCategory(categoryId),
        });
        ref.afterClosed().subscribe((saved) => {
            if (saved) this.categories.reload();
        });
    }

    /**
     * No transactions: plain confirm. Otherwise the user picks whether they become
     * uncategorized or move to another category.
     */
    async deleteCategory(
        householdId: string,
        categoryId: string,
    ): Promise<void> {
        const category = this.findCategory(categoryId);
        if (!category) return;

        let transferTo: string | undefined;
        if (category.transactionCount === 0) {
            const confirmed = await this.dialogs.confirm({
                title: 'category.delete.confirmTitle',
                message: 'category.delete.confirmMessage',
                confirm: 'category.delete.confirm',
                cancel: 'category.dialog.cancel',
            });
            if (!confirmed) return;
        } else {
            const ref = this.dialogs.open<
                CategoryDeleteDialogComponent,
                CategoryDeleteDialogData,
                CategoryDeleteChoice
            >(CategoryDeleteDialogComponent, {
                category,
                others: (this.categories.value() ?? []).filter(
                    (c) => c.id !== categoryId,
                ),
            });
            const choice = await firstValueFrom(ref.afterClosed());
            if (!choice) return;
            transferTo = choice.transferTo ?? undefined;
        }

        await this.categoryService.delete(householdId, categoryId, transferTo);
        this.categories.reload();
    }

    async signOut(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/' + APP_PATHS.LOGIN]);
    }

    private find(accountId?: string): AccountDto | undefined {
        return this.accounts.value()?.find((a) => a.id === accountId);
    }

    private findCategory(categoryId?: string): CategoryDto | undefined {
        return this.categories.value()?.find((c) => c.id === categoryId);
    }
}
