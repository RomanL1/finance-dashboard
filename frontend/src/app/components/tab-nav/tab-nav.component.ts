import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import {
    type IsActiveMatchOptions,
    RouterLink,
    RouterLinkActive,
} from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

export interface TabLink {
    /** Relative to the current route. */
    path: string;
    /** Translation key. */
    label: string;
}

/**
 * Secondary tab row for sub-routes of a page. Links are relative and keep the query params, so a
 * period selected on one tab carries over to the next. The page renders the outlet below.
 */
@Component({
    selector: 'app-tab-nav',
    imports: [
        MatTabNav,
        MatTabLink,
        MatTabNavPanel,
        RouterLink,
        RouterLinkActive,
        TranslatePipe,
    ],
    template: `
        <nav mat-tab-nav-bar [tabPanel]="panel" [mat-stretch-tabs]="true">
            @for (tab of tabs(); track tab.path) {
                <a
                    mat-tab-link
                    [routerLink]="[tab.path]"
                    queryParamsHandling="preserve"
                    routerLinkActive
                    #rla="routerLinkActive"
                    [routerLinkActiveOptions]="activeOptions"
                    [active]="rla.isActive"
                >
                    {{ tab.label | translate }}
                </a>
            }
        </nav>
        <mat-tab-nav-panel #panel>
            <ng-content />
        </mat-tab-nav-panel>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabNavComponent {
    readonly tabs = input.required<TabLink[]>();

    protected readonly activeOptions: IsActiveMatchOptions = {
        paths: 'exact',
        queryParams: 'ignored',
        matrixParams: 'ignored',
        fragment: 'ignored',
    };
}
