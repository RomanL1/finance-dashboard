import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
    TabNavComponent,
    type TabLink,
} from '../../../components/tab-nav/tab-nav.component';
import { ANALYTICS_PATHS } from '../../../config/paths.config';
import { HouseholdService } from '../../household/services/household.service';

/** Layout for the analytics tabs. The tabs share the `?period&start` query params through the tab links. */
@Component({
    selector: 'app-analytics-page',
    imports: [RouterOutlet, TabNavComponent, TranslatePipe],
    template: `
        <main class="mx-auto max-w-lg space-y-4 p-4 pb-8">
            <header>
                <h1 class="type-headline-small text-on-surface">
                    {{ 'analytics.title' | translate }}
                </h1>
                @if (household.value(); as h) {
                    <p class="type-body-medium text-on-surface-variant">
                        {{
                            'analytics.subtitle'
                                | translate: { currency: h.baseCurrency }
                        }}
                    </p>
                }
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
export class AnalyticsPage {
    readonly tabs: TabLink[] = [
        {
            path: ANALYTICS_PATHS.CATEGORIES,
            label: 'analytics.tabs.categories',
        },
        { path: ANALYTICS_PATHS.BUDGETS, label: 'analytics.tabs.budgets' },
    ];

    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    constructor(private readonly householdService: HouseholdService) {}
}
