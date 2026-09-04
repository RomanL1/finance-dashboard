import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_PATHS } from '../../../config/paths.config';

/** Authenticated layout: app header on top, tab bar bottom on phones and under the header from `md` up. */
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
    template: `
        <header
            class="fixed top-0 right-0 left-0 z-10 flex h-12 items-center justify-center bg-[var(--mat-sys-primary)] text-[var(--mat-sys-on-primary)] shadow-sm"
        >
            <span class="text-sm font-medium tracking-[0.2em] uppercase">
                {{ 'app.title' | translate }}
            </span>
        </header>
        <!-- Wrapper positions: Material's own position rule beats Tailwind utilities on the nav host. -->
        <div
            class="fixed right-0 bottom-0 left-0 z-10 border-t border-gray-300 bg-white md:top-12 md:bottom-auto md:border-t-0 md:border-b"
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
                        <mat-icon class="mr-1">{{ tab.icon }}</mat-icon>
                        {{ tab.label | translate }}
                    </a>
                }
            </nav>
        </div>
        <mat-tab-nav-panel #panel class="block pt-12 pb-16 md:pt-28 md:pb-0">
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
}
