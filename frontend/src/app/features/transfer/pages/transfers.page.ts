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
import { IconButtonComponent } from '../../../components/button/button.component';
import { DialogService } from '../../../components/dialog/dialog.service';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { AccountService } from '../../account/services/account.service';
import { HouseholdService } from '../../household/services/household.service';
import { pageCount } from '../../transaction/transaction.types';
import { TransferListComponent } from '../dumb_components/transfer-list/transfer-list.component';
import { TransferService } from '../services/transfer.service';
import { openTransferDialog } from '../smart_components/transfer-dialog/open-transfer-dialog';
import { toTransferRows } from '../transfer.types';

/** Transfers tab of the transactions page: money moved between own accounts, e.g. paying off a credit card. */
@Component({
    selector: 'app-transfers-page',
    imports: [
        TransferListComponent,
        SkeletonComponent,
        IconButtonComponent,
        MatFabButton,
        MatIcon,
        TranslatePipe,
    ],
    template: `
        <div class="space-y-3 pb-20">
            <p class="type-body-medium text-on-surface-variant">
                {{ 'transfer.page.subtitle' | translate }}
            </p>
            @if (household.error() || transfers.error() || accounts.error()) {
                <p
                    role="alert"
                    class="rounded-m3-md bg-error-container p-3 text-on-error-container"
                >
                    {{ 'transfer.loadFailed' | translate }}
                </p>
            } @else if (rows(); as list) {
                <div animate.enter="fade-in">
                    <app-transfer-list
                        [rows]="list"
                        (edit)="openDialog($event)"
                    />
                </div>
                @if (pages() > 1) {
                    <nav
                        class="flex items-center justify-center gap-2"
                        [attr.aria-label]="
                            'transaction.pager.label' | translate
                        "
                    >
                        <app-icon-button
                            [disabled]="page() <= 1"
                            [ariaLabel]="
                                'transaction.pager.previous' | translate
                            "
                            (clicked)="page.set(page() - 1)"
                        >
                            <mat-icon svgIcon="chevron_left" />
                        </app-icon-button>
                        <span
                            class="type-label-large text-on-surface-variant"
                            aria-live="polite"
                        >
                            {{
                                'transaction.pager.position'
                                    | translate
                                        : { page: page(), pages: pages() }
                            }}
                        </span>
                        <app-icon-button
                            [disabled]="page() >= pages()"
                            [ariaLabel]="'transaction.pager.next' | translate"
                            (clicked)="page.set(page() + 1)"
                        >
                            <mat-icon svgIcon="chevron_right" />
                        </app-icon-button>
                    </nav>
                }
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
                [attr.aria-label]="'transfer.dialog.title' | translate"
                [disabled]="!household.value()"
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
export class TransfersPage {
    /** 1-based. View state only: the tab is rarely paged. */
    readonly page = signal(1);

    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    readonly transfers = resource({
        params: () => {
            const householdId = this.household.value()?.id;
            return householdId ? { householdId, page: this.page() } : undefined;
        },
        loader: ({ params }) =>
            this.transferService.list(params.householdId, params.page),
    });

    /** All accounts, archived included: old transfers still name them. */
    readonly accounts = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.accountService.list(params),
    });

    /** Undefined while any part loads, so the skeleton shows. */
    readonly rows = computed(() => {
        const page = this.transfers.value();
        const accounts = this.accounts.value();
        return page && accounts
            ? toTransferRows(page.items, accounts, this.locale)
            : undefined;
    });

    readonly pages = computed(() => {
        const page = this.transfers.value();
        return page ? pageCount(page.total, page.pageSize) : 1;
    });

    protected readonly extendedFab =
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches;

    constructor(
        private readonly householdService: HouseholdService,
        private readonly transferService: TransferService,
        private readonly accountService: AccountService,
        private readonly dialogs: DialogService,
        @Inject(LOCALE_ID) private readonly locale: string,
    ) {}

    /** With `transferId` the dialog edits that transfer instead of creating one. */
    async openDialog(transferId?: string): Promise<void> {
        const household = this.household.value();
        if (!household) return;
        const ref = await openTransferDialog(this.dialogs, {
            householdId: household.id,
            transfer: this.transfers
                .value()
                ?.items.find((t) => t.id === transferId),
        });
        ref.afterClosed().subscribe((changed) => {
            if (!changed) return;
            this.transfers.reload();
            this.accounts.reload();
        });
    }
}
