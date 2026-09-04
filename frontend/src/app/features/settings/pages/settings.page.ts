import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
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

@Component({
    selector: 'app-settings-page',
    imports: [
        ButtonComponent,
        AccountManageListComponent,
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
            @if (household.isLoading() || accounts.isLoading()) {
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

    constructor(
        private readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
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

    async signOut(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/' + APP_PATHS.LOGIN]);
    }

    private find(accountId?: string): AccountDto | undefined {
        return this.accounts.value()?.find((a) => a.id === accountId);
    }
}
