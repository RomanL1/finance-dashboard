import {
    ChangeDetectionStrategy,
    Component,
    computed,
    resource,
} from '@angular/core';
import {
    MatButtonToggle,
    MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatFormField } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
    ThemeService,
    type ThemePreference,
} from '../../../core/theme/theme.service';
import { PrivacyService } from '../../../core/privacy/privacy.service';
import {
    LANGUAGES,
    LanguageService,
} from '../../../core/i18n/language.service';
import { SectionHeaderComponent } from '../../../components/section-header/section-header.component';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import {
    APP_PATHS,
    NEW_HOUSEHOLD_PARAM,
    SETTINGS_PATHS,
} from '../../../config/paths.config';
import { ButtonComponent } from '../../../components/button/button.component';
import { DialogService } from '../../../components/dialog/dialog.service';
import { CURRENCIES, type Currency } from '../../../core/constants/currencies';
import { timeZones } from '../../../core/constants/time-zones';
import { RecurringService } from '../../recurring/services/recurring.service';
import { HouseholdService } from '../../household/services/household.service';
import { HouseholdSwitcherComponent } from '../../household/dumb_components/household-switcher/household-switcher.component';
import { AccountService } from '../../account/services/account.service';
import { AccountManageListComponent } from '../../account/dumb_components/account-manage-list/account-manage-list.component';
import type { AccountDialogComponent } from '../../account/smart_components/account-dialog/account-dialog.component';
import type {
    AccountDialogData,
    AccountDto,
    UpdateAccountDto,
} from '../../account/account.types';
import { CategoryService } from '../../category/services/category.service';
import { CategoryManageListComponent } from '../../category/dumb_components/category-manage-list/category-manage-list.component';
import type { CategoryDeleteDialogComponent } from '../../category/dumb_components/category-delete-dialog/category-delete-dialog.component';
import type { CategoryDialogComponent } from '../../category/smart_components/category-dialog/category-dialog.component';
import type {
    CategoryDeleteChoice,
    CategoryDeleteDialogData,
    CategoryDialogData,
    CategoryDto,
} from '../../category/category.types';
import type { AppIcon } from '../../../core/icons/icons';

@Component({
    selector: 'app-settings-page',
    imports: [
        ButtonComponent,
        AccountManageListComponent,
        CategoryManageListComponent,
        HouseholdSwitcherComponent,
        RouterLink,
        MatProgressSpinner,
        MatButtonToggleGroup,
        MatButtonToggle,
        MatIcon,
        MatFormField,
        MatSelect,
        MatOption,
        MatSlideToggle,
        SectionHeaderComponent,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto max-w-lg space-y-6 p-4">
            <header class="flex items-center justify-between gap-4">
                <h1 class="type-headline-small text-on-surface">
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
            <section>
                <app-section-header
                    [title]="'settings.appearance.title' | translate"
                />
                <mat-button-toggle-group
                    class="w-full"
                    hideSingleSelectionIndicator
                    [value]="theme.preference()"
                    (change)="theme.set($event.value)"
                    [attr.aria-label]="'settings.appearance.title' | translate"
                >
                    @for (option of themeOptions; track option.value) {
                        <mat-button-toggle
                            class="flex-1"
                            [value]="option.value"
                        >
                            <mat-icon class="mr-1" [svgIcon]="option.icon" />
                            {{
                                'settings.appearance.' + option.value
                                    | translate
                            }}
                        </mat-button-toggle>
                    }
                </mat-button-toggle-group>
                <mat-button-toggle-group
                    class="mt-3 w-full"
                    hideSingleSelectionIndicator
                    [value]="language.current"
                    (change)="language.set($event.value)"
                    [attr.aria-label]="
                        'settings.appearance.language' | translate
                    "
                >
                    @for (option of languages; track option.value) {
                        <mat-button-toggle
                            class="flex-1"
                            [value]="option.value"
                        >
                            {{ option.label }}
                        </mat-button-toggle>
                    }
                </mat-button-toggle-group>
                <div class="mt-3 flex flex-col gap-1">
                    <mat-slide-toggle
                        [checked]="privacy.hideBalances()"
                        (change)="privacy.setHideBalances($event.checked)"
                    >
                        {{ 'settings.appearance.hideBalances' | translate }}
                    </mat-slide-toggle>
                    <mat-slide-toggle
                        [checked]="privacy.hideTransactions()"
                        (change)="privacy.setHideTransactions($event.checked)"
                    >
                        {{ 'settings.appearance.hideTransactions' | translate }}
                    </mat-slide-toggle>
                </div>
                <p class="type-body-small mt-1 text-on-surface-variant">
                    {{ 'settings.appearance.hideAmountsHint' | translate }}
                </p>
            </section>
            @if (
                household.isLoading() ||
                accounts.isLoading() ||
                categories.isLoading()
            ) {
                <mat-spinner class="mx-auto" diameter="40" />
            } @else if (household.value(); as h) {
                <section>
                    <app-section-header
                        [title]="'settings.households.title' | translate"
                    />
                    <app-household-switcher
                        [households]="households.value() ?? []"
                        [activeId]="h.id"
                        (picked)="switchHousehold($event)"
                        (create)="createHousehold()"
                    />
                </section>
                <section>
                    <app-section-header
                        [title]="'settings.household.title' | translate"
                    />
                    <dl
                        class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-m3-lg bg-surface-low p-4"
                    >
                        <dt class="type-label-large text-on-surface-variant">
                            {{ 'settings.household.name' | translate }}
                        </dt>
                        <dd class="type-body-large text-on-surface">
                            {{ h.name }}
                        </dd>
                        <dt class="type-label-large text-on-surface-variant">
                            {{ 'settings.household.role' | translate }}
                        </dt>
                        <dd class="type-body-large text-on-surface">
                            {{
                                'settings.household.roles.' + h.role | translate
                            }}
                        </dd>
                        <dt class="type-label-large text-on-surface-variant">
                            {{ 'settings.household.baseCurrency' | translate }}
                        </dt>
                        <dd class="type-body-large text-on-surface">
                            @if (h.role === 'owner') {
                                <!-- Owners pick; the change is saved on selection, there is nothing else to fill in. -->
                                <mat-form-field
                                    class="w-32"
                                    subscriptSizing="dynamic"
                                >
                                    <mat-select
                                        [attr.aria-label]="
                                            'settings.household.baseCurrency'
                                                | translate
                                        "
                                        [value]="h.baseCurrency"
                                        (selectionChange)="
                                            setBaseCurrency(h.id, $event.value)
                                        "
                                    >
                                        @for (
                                            currency of currencies;
                                            track currency
                                        ) {
                                            <mat-option [value]="currency">{{
                                                currency
                                            }}</mat-option>
                                        }
                                    </mat-select>
                                </mat-form-field>
                            } @else {
                                {{ h.baseCurrency }}
                            }
                        </dd>
                        <dd
                            class="type-body-small col-span-2 text-on-surface-variant"
                        >
                            {{
                                'settings.household.baseCurrencyHint'
                                    | translate
                            }}
                        </dd>
                        <dt
                            class="type-label-large mt-2 text-on-surface-variant"
                        >
                            {{ 'settings.household.timeZone' | translate }}
                        </dt>
                        <dd class="type-body-large mt-2 text-on-surface">
                            @if (h.role === 'owner') {
                                <mat-form-field
                                    class="w-full"
                                    subscriptSizing="dynamic"
                                >
                                    <mat-select
                                        [attr.aria-label]="
                                            'settings.household.timeZone'
                                                | translate
                                        "
                                        [value]="h.timeZone"
                                        (selectionChange)="
                                            setTimeZone(h.id, $event.value)
                                        "
                                    >
                                        @for (
                                            zone of timeZoneOptions();
                                            track zone
                                        ) {
                                            <mat-option [value]="zone">{{
                                                zone
                                            }}</mat-option>
                                        }
                                    </mat-select>
                                </mat-form-field>
                            } @else {
                                {{ h.timeZone }}
                            }
                        </dd>
                        <dd
                            class="type-body-small col-span-2 text-on-surface-variant"
                        >
                            {{ 'settings.household.timeZoneHint' | translate }}
                        </dd>
                    </dl>
                    <a
                        class="mt-3 flex min-h-14 items-center gap-3 rounded-m3-lg bg-surface-low px-4 text-on-surface"
                        [routerLink]="membersPath"
                    >
                        <mat-icon svgIcon="group" />
                        <span class="type-body-large flex-1">{{
                            'settings.household.members' | translate
                        }}</span>
                        <mat-icon svgIcon="chevron_right" />
                    </a>
                </section>
                <section>
                    <app-section-header
                        [title]="'settings.accounts.title' | translate"
                    >
                        <app-button
                            type="button"
                            variant="tonal"
                            (clicked)="openAccountDialog(h.id)"
                        >
                            {{ 'settings.accounts.add' | translate }}
                        </app-button>
                    </app-section-header>
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
                <section>
                    <app-section-header
                        [title]="'settings.categories.title' | translate"
                    >
                        <app-button
                            type="button"
                            variant="tonal"
                            (clicked)="openCategoryDialog(h.id)"
                        >
                            {{ 'settings.categories.add' | translate }}
                        </app-button>
                    </app-section-header>
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
    protected readonly themeOptions: {
        value: ThemePreference;
        icon: AppIcon;
    }[] = [
        { value: 'system', icon: 'brightness_auto' },
        { value: 'light', icon: 'light_mode' },
        { value: 'dark', icon: 'dark_mode' },
    ];

    protected readonly languages = LANGUAGES;
    protected readonly currencies = CURRENCIES;
    protected readonly membersPath = SETTINGS_PATHS.MEMBERS;

    readonly households = resource({
        loader: () => this.householdService.getHouseholds(),
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

    /** The household's own zone stays selectable even if this browser does not know it. */
    protected readonly timeZoneOptions = computed(() =>
        timeZones(this.household.value()?.timeZone),
    );

    constructor(
        private readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly recurringService: RecurringService,
        private readonly dialogs: DialogService,
        private readonly router: Router,
        protected readonly theme: ThemeService,
        protected readonly privacy: PrivacyService,
        protected readonly language: LanguageService,
    ) {}

    /** Relabels every account server-side, so the list reloads too. Amounts are not converted. */
    async setBaseCurrency(
        householdId: string,
        baseCurrency: Currency,
    ): Promise<void> {
        await this.householdService.update(householdId, { baseCurrency });
        this.household.reload();
        this.accounts.reload();
    }

    /** Only later recurring bookings move to the new zone's midnight; booked ones stay. */
    async setTimeZone(householdId: string, timeZone: string): Promise<void> {
        await this.householdService.update(householdId, { timeZone });
        this.household.reload();
    }

    /** Reloads the app in the picked household. */
    switchHousehold(householdId: string): void {
        this.householdService.switchTo(householdId);
    }

    /** The onboarding steps again, for one more household of this user. */
    async createHousehold(): Promise<void> {
        await this.router.navigate(['/' + APP_PATHS.ONBOARDING], {
            queryParams: { [NEW_HOUSEHOLD_PARAM]: 1 },
        });
    }

    async openAccountDialog(
        householdId: string,
        accountId?: string,
    ): Promise<void> {
        const ref = await this.dialogs.open<
            AccountDialogComponent,
            AccountDialogData,
            AccountDto
        >(
            () =>
                import('../../account/smart_components/account-dialog/account-dialog.component').then(
                    (m) => m.AccountDialogComponent,
                ),
            {
                householdId,
                currency: this.household.value()!.baseCurrency,
                account: this.find(accountId),
            },
        );
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
        await this.setArchived(householdId, account, archived);
    }

    private async setArchived(
        householdId: string,
        account: AccountDto,
        archived: boolean,
    ): Promise<void> {
        await this.accountService.update(householdId, account.id, {
            description: account.description,
            type: account.type,
            /** Response type is plain string; the request enum is narrower. Server validates. */
            currency: account.currency as UpdateAccountDto['currency'],
            startDate: account.startDate,
            archivedAt: archived ? new Date().toISOString() : null,
        });
        this.accounts.reload();
    }

    /** Only empty accounts go. One with transactions keeps its history: the user is led to archiving instead. */
    async deleteAccount(householdId: string, accountId: string): Promise<void> {
        const account = this.find(accountId);
        if (!account) return;
        const confirmed = await this.dialogs.confirm({
            title: 'account.delete.title',
            message: 'account.delete.message',
            confirm: 'account.delete.confirm',
            cancel: 'account.dialog.cancel',
        });
        if (!confirmed) return;
        // Recurring transactions keep an account alive; say so instead of the transactions message.
        const rules = await this.recurringService.list(householdId);
        if (rules.some((rule) => rule.accountId === accountId)) {
            await this.dialogs.confirm({
                title: 'account.delete.blockedRecurringTitle',
                message: 'account.delete.blockedRecurringMessage',
                confirm: 'account.delete.blockedOk',
            });
            return;
        }
        if (await this.accountService.delete(householdId, accountId)) {
            this.accounts.reload();
            return;
        }
        if (account.archivedAt) {
            await this.dialogs.confirm({
                title: 'account.delete.blockedTitle',
                message: 'account.delete.blockedArchivedMessage',
                confirm: 'account.delete.blockedOk',
            });
            return;
        }
        const archiveInstead = await this.dialogs.confirm({
            title: 'account.delete.blockedTitle',
            message: 'account.delete.blockedMessage',
            confirm: 'account.archive.confirm',
            cancel: 'account.dialog.cancel',
        });
        if (archiveInstead) await this.setArchived(householdId, account, true);
    }

    async openCategoryDialog(
        householdId: string,
        categoryId?: string,
    ): Promise<void> {
        const ref = await this.dialogs.open<
            CategoryDialogComponent,
            CategoryDialogData,
            CategoryDto
        >(
            () =>
                import('../../category/smart_components/category-dialog/category-dialog.component').then(
                    (m) => m.CategoryDialogComponent,
                ),
            {
                householdId,
                category: this.findCategory(categoryId),
            },
        );
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
            const ref = await this.dialogs.open<
                CategoryDeleteDialogComponent,
                CategoryDeleteDialogData,
                CategoryDeleteChoice
            >(
                () =>
                    import('../../category/dumb_components/category-delete-dialog/category-delete-dialog.component').then(
                        (m) => m.CategoryDeleteDialogComponent,
                    ),
                {
                    category,
                    others: (this.categories.value() ?? []).filter(
                        (c) => c.id !== categoryId,
                    ),
                },
            );
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
