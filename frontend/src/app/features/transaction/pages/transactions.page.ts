import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
    TabNavComponent,
    type TabLink,
} from '../../../components/tab-nav/tab-nav.component';
import { TRANSACTION_PATHS } from '../../../config/paths.config';

/** Layout for the transaction tabs: the booked history and the recurring transactions that feed it. */
@Component({
    selector: 'app-transactions-page',
    imports: [RouterOutlet, TabNavComponent, TranslatePipe],
    template: `
        <main class="mx-auto max-w-lg space-y-4 p-4 pb-8">
            <header>
                <h1 class="type-headline-small text-on-surface">
                    {{ 'transaction.page.title' | translate }}
                </h1>
            </header>
            <app-tab-nav [tabs]="tabs">
                <div class="pt-4">
                    <router-outlet />
                </div>
            </app-tab-nav>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
    readonly tabs: TabLink[] = [
        { path: TRANSACTION_PATHS.HISTORY, label: 'transaction.tabs.history' },
        {
            path: TRANSACTION_PATHS.RECURRING,
            label: 'transaction.tabs.recurring',
        },
    ];
}
