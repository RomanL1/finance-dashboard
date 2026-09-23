import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { TabNavComponent, type TabLink } from './tab-nav.component';

@Component({
    imports: [TabNavComponent],
    template: `<app-tab-nav [tabs]="tabs"><p>content</p></app-tab-nav>`,
})
class HostComponent {
    readonly tabs: TabLink[] = [
        { path: 'overview', label: 'tabs.overview' },
        { path: 'categories', label: 'tabs.categories' },
    ];
}

@Component({ template: '' })
class EmptyComponent {}

describe('TabNavComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                provideRouter([
                    { path: 'overview', component: EmptyComponent },
                    { path: 'categories', component: EmptyComponent },
                ]),
            ],
        });
    });

    async function renderAt(url: string): Promise<HTMLAnchorElement[]> {
        await TestBed.inject(Router).navigateByUrl(url);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        // RouterLinkActive settles asynchronously after the first pass.
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('content');
        return Array.from(el.querySelectorAll('a'));
    }

    it('renders a link per tab that keeps the query params', async () => {
        const links = await renderAt('/overview?period=week&start=2026-09-07');

        expect(links.map((a) => a.textContent!.trim())).toEqual([
            'tabs.overview',
            'tabs.categories',
        ]);
        expect(links[1].getAttribute('href')).toBe(
            '/categories?period=week&start=2026-09-07',
        );
    });

    it('marks the tab of the current route active, ignoring query params', async () => {
        const links = await renderAt('/categories?period=month');

        expect(links[0].getAttribute('aria-selected')).toBe('false');
        expect(links[1].getAttribute('aria-selected')).toBe('true');
    });
});
