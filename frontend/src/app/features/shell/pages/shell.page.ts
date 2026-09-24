import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import {
    type IsActiveMatchOptions,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
} from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../../config/paths.config';
import { AuthService } from '../../../core/auth/auth.service';
import type { AppIcon } from '../../../core/icons/icons';

/**
 * Authenticated layout: M3 top app bar, navigation bar at the bottom on phones and a tab row
 * under the header from `md` up. The shell fills the viewport and only the content panel
 * scrolls: the document itself never scrolls, so nothing is painted behind the translucent
 * bottom toolbar of iOS Firefox (which clips fixed elements there but shows document content).
 * Sticky elements inside pages offset from the panel's top edge (see transaction-list.component.ts).
 */
@Component({
    selector: 'app-shell-page',
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatTabNav,
        MatTabLink,
        MatTabNavPanel,
        MatIcon,
        TranslatePipe,
    ],
    host: { class: 'flex h-dvh flex-col' },
    template: `
        <header
            class="flex h-14 shrink-0 touch-none items-center px-4 transition-colors duration-150 motion-reduce:transition-none"
            [class]="
                scrolled() ? 'bg-surface-container shadow-sm' : 'bg-surface'
            "
        >
            <span class="type-title-large text-on-surface">
                {{ 'app.title' | translate: { name: auth.user()?.name } }}
            </span>
        </header>
        <!-- Wrapper positions: Material's own position rule beats Tailwind utilities on the nav host.
             touch-none: a pan that starts on the bars must not fall through to the document. -->
        <div
            class="app-nav-bar order-3 shrink-0 touch-none bg-surface-container md:order-2 md:bg-surface"
            [class.md:shadow-sm]="scrolled()"
        >
            <nav mat-tab-nav-bar [tabPanel]="panel" [mat-stretch-tabs]="true">
                @for (tab of tabs; track tab.path) {
                    <a
                        mat-tab-link
                        class="group"
                        [routerLink]="'/' + tab.path"
                        routerLinkActive
                        #rla="routerLinkActive"
                        [routerLinkActiveOptions]="
                            tab.path === '' ? exactOptions : subsetOptions
                        "
                        [active]="rla.isActive"
                    >
                        <!-- One active indicator per idiom: a pill behind the icon on phones (navigation bar),
                             Material's sliding underline from md up (tab row). The pill scales in and out along
                             the same path and dips on touch-down so the tap answers before the route does. -->
                        <span
                            class="flex flex-col items-center gap-0.5 transition-colors duration-150 md:flex-row md:gap-2 motion-reduce:transition-none"
                            [class]="
                                rla.isActive
                                    ? 'text-on-surface md:text-primary'
                                    : 'text-on-surface-variant'
                            "
                        >
                            <span
                                class="flex items-center justify-center rounded-full transition-[background-color,transform] duration-150 ease-out max-md:h-8 max-md:w-16 max-md:group-active:scale-[0.92] motion-reduce:transition-none"
                                [class]="
                                    rla.isActive
                                        ? 'max-md:bg-secondary-container max-md:text-on-secondary-container'
                                        : 'max-md:scale-[0.85]'
                                "
                            >
                                <mat-icon [svgIcon]="tab.icon" />
                            </span>
                            <span class="type-label-medium md:type-label-large">
                                {{ tab.label | translate }}
                            </span>
                        </span>
                    </a>
                }
            </nav>
        </div>
        <mat-tab-nav-panel
            #panel
            class="order-2 block min-h-0 flex-1 overflow-y-auto bg-surface md:order-3"
            (scroll)="onScroll($event)"
        >
            <router-outlet />
        </mat-tab-nav-panel>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellPage {
    constructor(protected readonly auth: AuthService) {}

    /**
     * A tab stays active on its child routes (analytics/budgets), and query params (period filter)
     * must not drop it. Home is `/`, a prefix of everything, so it alone needs an exact match.
     */
    protected readonly subsetOptions: IsActiveMatchOptions = {
        paths: 'subset',
        queryParams: 'ignored',
        matrixParams: 'ignored',
        fragment: 'ignored',
    };
    protected readonly exactOptions: IsActiveMatchOptions = {
        ...this.subsetOptions,
        paths: 'exact',
    };

    readonly tabs: { path: string; icon: AppIcon; label: string }[] = [
        { path: APP_PATHS.HOME, icon: 'home', label: 'nav.home' },
        {
            path: APP_PATHS.TRANSACTIONS,
            icon: 'receipt_long',
            label: 'nav.transactions',
        },
        {
            path: APP_PATHS.ANALYTICS,
            icon: 'bar_chart',
            label: 'nav.analytics',
        },
        { path: APP_PATHS.SETTINGS, icon: 'settings', label: 'nav.settings' },
    ];

    /** Scroll-edge: the header only separates from content once something is under it. */
    protected readonly scrolled = signal(false);

    protected onScroll(event: Event): void {
        this.scrolled.set((event.target as HTMLElement).scrollTop > 0);
    }
}
