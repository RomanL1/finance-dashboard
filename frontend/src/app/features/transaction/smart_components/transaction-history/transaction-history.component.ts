import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    LOCALE_ID,
    output,
    resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { IconButtonComponent } from '../../../../components/button/button.component';
import { DialogService } from '../../../../components/dialog/dialog.service';
import { SectionHeaderComponent } from '../../../../components/section-header/section-header.component';
import { SkeletonComponent } from '../../../../components/skeleton/skeleton.component';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import { APP_PATHS } from '../../../../config/paths.config';
import { TransactionFilterComponent } from '../../dumb_components/transaction-filter/transaction-filter.component';
import { TransactionListComponent } from '../../dumb_components/transaction-list/transaction-list.component';
import { TransactionService } from '../../services/transaction.service';
import {
    pageCount,
    parseTransactionParams,
    sameQuery,
    toTransactionGroups,
    toTransactionParams,
    type TransactionDialogData,
    type TransactionFilter,
    type TransactionQuery,
} from '../../transaction.types';
import type { TransactionDialogComponent } from '../transaction-dialog/transaction-dialog.component';

const RECENT_COUNT = 10;

/**
 * Household history plus the add/edit/delete flows around it.
 * `full`: filter + pager, state in the URL (`?account=&category=&page=`) so reload and back/forward keep it.
 * `recent`: the latest few rows with a link to the full list; ignores the URL.
 */
@Component({
    selector: 'app-transaction-history',
    imports: [
        TransactionFilterComponent,
        TransactionListComponent,
        SectionHeaderComponent,
        SkeletonComponent,
        IconButtonComponent,
        MatFabButton,
        MatIcon,
        RouterLink,
        TranslatePipe,
    ],
    template: `
        <section class="space-y-3">
            @if (mode() === 'recent') {
                <app-section-header
                    [title]="
                        'transaction.recent.title'
                            | translate: { count: RECENT_COUNT }
                    "
                >
                    <a
                        [routerLink]="'/' + PATHS.TRANSACTIONS"
                        class="type-label-large text-primary"
                    >
                        {{ 'transaction.recent.all' | translate }}
                    </a>
                </app-section-header>
            } @else {
                <!-- Deferred: mat-select pulls in @angular/forms, which the home page's recent mode never needs.
                     Placeholder = form-field height, so nothing shifts when it loads. -->
                @defer (on immediate) {
                    <app-transaction-filter
                        [accounts]="accounts()"
                        [categories]="categories()"
                        [filter]="query()"
                        (filterChange)="setFilter($event)"
                    />
                } @placeholder {
                    <div class="h-14"></div>
                }
            }
            @if (page.value(); as page) {
                <app-transaction-list
                    [groups]="groups()"
                    (edit)="openDialog($event)"
                />
                @if (mode() === 'full' && pages() > 1) {
                    <nav
                        class="flex items-center justify-center gap-2"
                        [attr.aria-label]="
                            'transaction.pager.label' | translate
                        "
                    >
                        <app-icon-button
                            [disabled]="page.page <= 1"
                            [ariaLabel]="
                                'transaction.pager.previous' | translate
                            "
                            (clicked)="setPage(page.page - 1)"
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
                                        : { page: page.page, pages: pages() }
                            }}
                        </span>
                        <app-icon-button
                            [disabled]="page.page >= pages()"
                            [ariaLabel]="'transaction.pager.next' | translate"
                            (clicked)="setPage(page.page + 1)"
                        >
                            <mat-icon svgIcon="chevron_right" />
                        </app-icon-button>
                    </nav>
                }
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
                [attr.aria-label]="'transaction.dialog.title' | translate"
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
export class TransactionHistoryComponent {
    readonly householdId = input.required<string>();
    /** All accounts, archived included: rows and the filter both need them. */
    readonly accounts = input.required<AccountDto[]>();
    readonly categories = input.required<CategoryDto[]>();
    readonly mode = input<'recent' | 'full'>('full');
    /** Fires after a create, update or delete so the owner can refresh balances and stats. */
    readonly changed = output<void>();

    private readonly locale = inject(LOCALE_ID);
    /** Field, not constructor param: `queryParams` below reads it during initialization. */
    private readonly route = inject(ActivatedRoute);

    private readonly queryParams = toSignal(
        this.route.queryParamMap.pipe(
            map((params): Record<string, string | undefined> => ({
                account: params.get('account') ?? undefined,
                category: params.get('category') ?? undefined,
                page: params.get('page') ?? undefined,
            })),
        ),
        { initialValue: {} },
    );

    /** `equal` stops the other query params on the page (stats period) from refetching. */
    readonly query = computed<TransactionQuery>(
        () =>
            this.mode() === 'recent'
                ? { page: 1 }
                : parseTransactionParams(this.queryParams()),
        { equal: sameQuery },
    );

    readonly page = resource({
        params: () => ({
            householdId: this.householdId(),
            query: this.query(),
            pageSize: this.mode() === 'recent' ? RECENT_COUNT : undefined,
        }),
        loader: ({ params }) =>
            this.transactionService.list(
                params.householdId,
                params.query,
                params.pageSize,
            ),
    });

    readonly pages = computed(() => {
        const page = this.page.value();
        return page ? pageCount(page.total, page.pageSize) : 1;
    });

    /** Grouped at load time: "today" is not re-evaluated at midnight until the next reload. */
    readonly groups = computed(() =>
        toTransactionGroups(
            this.page.value()?.items ?? [],
            this.accounts(),
            this.categories(),
            new Date(),
            this.locale,
        ),
    );

    protected readonly PATHS = APP_PATHS;
    protected readonly RECENT_COUNT = RECENT_COUNT;

    protected readonly extendedFab =
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches;

    constructor(
        private readonly router: Router,
        private readonly transactionService: TransactionService,
        private readonly dialogs: DialogService,
    ) {}

    /** A new filter starts over at page 1. */
    setFilter(filter: TransactionFilter): void {
        this.navigate({ ...filter, page: 1 });
    }

    setPage(page: number): void {
        this.navigate({ ...this.query(), page });
    }

    /** With `transactionId` the dialog edits that row instead of creating one. */
    async openDialog(transactionId?: string): Promise<void> {
        const ref = await this.dialogs.open<
            TransactionDialogComponent,
            TransactionDialogData,
            boolean
        >(
            () =>
                import('../transaction-dialog/transaction-dialog.component').then(
                    (m) => m.TransactionDialogComponent,
                ),
            {
                householdId: this.householdId(),
                categories: this.categories(),
                transaction: this.page
                    .value()
                    ?.items.find((t) => t.id === transactionId),
            },
            /* Editing: no keyboard popping up over the prefilled form. */
            { focusInput: !transactionId },
        );
        ref.afterClosed().subscribe((changed) => {
            if (changed) this.reload();
        });
    }

    /** Merge keeps the period params the stats card owns on the same URL. */
    private navigate(query: TransactionQuery): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: toTransactionParams(query),
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    private reload(): void {
        this.page.reload();
        this.changed.emit();
    }
}
