import { inputBinding, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import {
    periodOf,
    shiftPeriod,
    type Period,
    type PeriodKind,
} from '../../stats.types';
import { PeriodSwitcherComponent } from './period-switcher.component';

describe('PeriodSwitcherComponent', () => {
    const period = signal<Period>(periodOf('month'));
    const kinds = signal<PeriodKind[]>(['week', 'month', 'year']);

    function create() {
        const fixture = TestBed.createComponent(PeriodSwitcherComponent, {
            bindings: [
                inputBinding('period', period),
                inputBinding('kinds', kinds),
            ],
        });
        fixture.detectChanges();
        const emitted: Period[] = [];
        fixture.componentInstance.periodChange.subscribe((p) =>
            emitted.push(p),
        );
        const el = fixture.nativeElement as HTMLElement;
        const byLabel = (label: string) =>
            el.querySelector<HTMLButtonElement>(
                `button[aria-label="${label}"]`,
            )!;
        return { fixture, el, emitted, byLabel };
    }

    beforeEach(() => {
        period.set(periodOf('month'));
        kinds.set(['week', 'month', 'year']);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: LOCALE_ID, useValue: 'en' },
            ],
        });
    });

    it('steps back and forth', () => {
        const { emitted, byLabel } = create();

        byLabel('stats.period.previous').click();
        byLabel('stats.period.next').click();

        expect(emitted).toEqual([
            shiftPeriod(period(), -1),
            shiftPeriod(period(), 1),
        ]);
    });

    it('disables the jump back while on the current period', () => {
        const { el, byLabel } = create();

        expect(byLabel('stats.period.today').disabled).toBe(true);
        expect(el.textContent).not.toContain('stats.period.current.month');
    });

    it('offers a jump back to today away from it', () => {
        period.set(shiftPeriod(periodOf('month'), -3));
        const { el, emitted, byLabel } = create();

        expect(byLabel('stats.period.today').disabled).toBe(false);
        expect(el.textContent).toContain('stats.period.current.month');

        byLabel('stats.period.today').click();

        expect(emitted).toEqual([periodOf('month')]);
    });

    it('re-anchors on today when the kind changes', () => {
        period.set(shiftPeriod(periodOf('month'), -3));
        const { el, emitted } = create();

        const toggles = el.querySelectorAll<HTMLButtonElement>(
            'mat-button-toggle button',
        );
        expect(toggles).toHaveLength(3);
        toggles[0].click();

        expect(emitted).toEqual([periodOf('week')]);
    });

    it('hides the kind toggle for a single kind', () => {
        kinds.set(['month']);
        const { el } = create();

        expect(el.querySelector('mat-button-toggle-group')).toBeNull();
    });

    it('labels the period in the app locale', () => {
        period.set(periodOf('year', new Date(2026, 5, 1)));
        const { byLabel } = create();

        expect(byLabel('stats.period.today').textContent!.trim()).toBe('2026');
    });
});
