import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AccountBadgeComponent } from './account-badge.component';

describe('AccountBadgeComponent', () => {
    const size = signal<'sm' | 'md'>('md');

    function badge(number: number): HTMLElement {
        const fixture = TestBed.createComponent(AccountBadgeComponent, {
            bindings: [
                inputBinding('number', () => number),
                inputBinding('size', size),
            ],
        });
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('span');
    }

    beforeEach(() => {
        size.set('md');
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('shows the number', () => {
        expect(badge(3).textContent!.trim()).toBe('3');
    });

    it.each([
        [1, 1],
        [8, 8],
        [9, 1],
        [17, 1],
        [12, 4],
    ])('colors account %i with hue %i, cycling through eight', (n, hue) => {
        expect(badge(n).style.background).toBe(`var(--app-account-${hue})`);
    });

    it('comes in a small size for list rows', () => {
        expect(badge(1).classList).toContain('h-7');
        size.set('sm');
        expect(badge(1).classList).toContain('h-5');
    });
});
