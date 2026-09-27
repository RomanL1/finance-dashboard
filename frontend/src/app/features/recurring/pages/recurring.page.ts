import {
    ChangeDetectionStrategy,
    Component,
    computed,
    Inject,
    LOCALE_ID,
    resource,
    signal,
} from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogService } from '../../../components/dialog/dialog.service';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { AccountService } from '../../account/services/account.service';
import { CategoryService } from '../../category/services/category.service';
import { HouseholdService } from '../../household/services/household.service';
import { RecurringListComponent } from '../dumb_components/recurring-list/recurring-list.component';
import {
    toRecurringRows,
    type RecurringDialogData,
    type RecurringRow,
} from '../recurring.types';
import { RecurringService } from '../services/recurring.service';
import type { RecurringDialogComponent } from '../smart_components/recurring-dialog/recurring-dialog.component';

/** Recurring tab of the transactions page (stories C6–C11): list, add, edit, pause/resume, delete. */
@Component({
    selector: 'app-recurring-page',
    imports: [
        RecurringListComponent,
        SkeletonComponent,
        MatFabButton,
        MatIcon,
        TranslatePipe,
    ],
    template: `
        <div class="space-y-3 pb-20">
            <p class="type-body-medium text-on-surface-variant">
                {{ 'recurring.page.subtitle' | translate }}
            </p>
            @if (
                household.error() ||
                rules.error() ||
                accounts.error() ||
                categories.error()
            ) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'recurring.loadFailed' | translate }}
                </p>
            } @else if (rows(); as list) {
                @if (toggleFailed()) {
                    <p role="alert" class="type-body-medium text-error">
                        {{ 'recurring.list.toggleFailed' | translate }}
                    </p>
                }
                <div animate.enter="fade-in">
                    <app-recurring-list
                        [rows]="list"
                        (edit)="openDialog($event)"
                        (togglePaused)="togglePaused($event)"
                    />
                </div>
            } @else {
                <app-skeleton variant="list" />
            }
        </div>

        <!-- Wrapper positions: Material's own position:relative beats layered Tailwind utilities on the button. -->
        <div
            class="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 touch-none md:bottom-4"
        >
            <button
                matFab
                [extended]="extendedFab"
                type="button"
                [attr.aria-label]="'recurring.dialog.title' | translate"
                [disabled]="!household.value() || !categories.value()"
                (click)="openDialog()"
            >
                <mat-icon svgIcon="add" />
                <span class="hidden md:inline">
                    {{ 'home.add' | translate }}
                </span>
            </button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringPage {
    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    readonly rules = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.recurringService.list(params),
    });

    readonly accounts = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.accountService.list(params),
    });

    readonly categories = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.categoryService.list(params),
    });

    /** Undefined while any part loads, so the skeleton shows. */
    readonly rows = computed(() => {
        const rules = this.rules.value();
        const accounts = this.accounts.value();
        const categories = this.categories.value();
        return rules && accounts && categories
            ? toRecurringRows(rules, accounts, categories, this.locale)
            : undefined;
    });

    readonly toggleFailed = signal(false);

    protected readonly extendedFab =
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches;

    constructor(
        private readonly householdService: HouseholdService,
        private readonly recurringService: RecurringService,
        private readonly accountService: AccountService,
        private readonly categoryService: CategoryService,
        private readonly dialogs: DialogService,
        @Inject(LOCALE_ID) private readonly locale: string,
    ) {}

    /** Resuming skips what fell into the pause; the server answers with the new next date. */
    async togglePaused(row: RecurringRow): Promise<void> {
        const household = this.household.value();
        if (!household) return;
        this.toggleFailed.set(false);
        try {
            const updated = await this.recurringService.setPaused(
                household.id,
                row.id,
                !row.paused,
            );
            this.rules.update((rules) =>
                rules?.map((r) => (r.id === updated.id ? updated : r)),
            );
        } catch {
            this.toggleFailed.set(true);
        }
    }

    /** With `ruleId` the dialog edits that rule instead of creating one. */
    async openDialog(ruleId?: string): Promise<void> {
        const household = this.household.value();
        const categories = this.categories.value();
        if (!household || !categories) return;
        const ref = await this.dialogs.open<
            RecurringDialogComponent,
            RecurringDialogData,
            boolean
        >(
            () =>
                import('../smart_components/recurring-dialog/recurring-dialog.component').then(
                    (m) => m.RecurringDialogComponent,
                ),
            {
                householdId: household.id,
                categories,
                rule: this.rules.value()?.find((r) => r.id === ruleId),
            },
            { focusInput: !ruleId },
        );
        ref.afterClosed().subscribe((changed) => {
            if (changed) this.rules.reload();
        });
    }
}
