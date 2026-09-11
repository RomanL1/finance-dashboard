import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../../config/paths.config';

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
                {{ 'app.title' | translate }}
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
                        [routerLink]="'/' + tab.path"
                        routerLinkActive
                        #rla="routerLinkActive"
                        [routerLinkActiveOptions]="{ exact: true }"
                        [active]="rla.isActive"
                    >
                        <span
                            class="flex flex-col items-center gap-0.5 md:flex-row md:gap-2"
                        >
                            <span
                                class="app-nav-pill flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-150 md:h-auto md:w-auto motion-reduce:transition-none"
                                [class.bg-secondary-container]="rla.isActive"
                            >
                                <mat-icon
                                    [class.text-on-secondary-container]="
                                        rla.isActive
                                    "
                                >
                                    {{ tab.icon }}
                                </mat-icon>
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
    readonly tabs = [
        { path: APP_PATHS.HOME, icon: 'home', label: 'nav.home' },
        { path: APP_PATHS.SETTINGS, icon: 'settings', label: 'nav.settings' },
    ];

    /** Scroll-edge: the header only separates from content once something is under it. */
    protected readonly scrolled = signal(false);

    protected onScroll(event: Event): void {
        this.scrolled.set((event.target as HTMLElement).scrollTop > 0);
    }
}
