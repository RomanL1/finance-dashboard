import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { SafeToSpend } from '../../budget.types';
import { SafeToSpendCardComponent } from './safe-to-spend-card.component';

describe('SafeToSpendCardComponent', () => {
    const value = signal<SafeToSpend>({
        income: 0,
        expenses: 0,
        reserved: 0,
        amount: 0,
    });
    const hasLimits = signal(true);

    function create() {
        const fixture = TestBed.createComponent(SafeToSpendCardComponent, {
            bindings: [
                inputBinding('value', value),
                inputBinding('currency', () => 'CHF'),
                inputBinding('hasLimits', hasLimits),
            ],
        });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const widths = Array.from(
            el.querySelectorAll<HTMLElement>('[role="img"] > div'),
        ).map((d) => d.style.width);
        return { el, widths };
    }

    beforeEach(() => {
        hasLimits.set(true);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('splits the bar into spent, held by budgets and free', () => {
        value.set({
            income: 10000,
            expenses: 4000,
            reserved: 1000,
            amount: 5000,
        });

        expect(create().widths).toEqual(['40%', '10%', '50%']);
    });

    it('leaves nothing free when more is committed than came in', () => {
        value.set({
            income: 1000,
            expenses: 1500,
            reserved: 500,
            amount: -1000,
        });

        expect(create().widths).toEqual(['75%', '25%', '0%']);
    });

    it('explains the number when there are no limits', () => {
        value.set({ income: 100, expenses: 0, reserved: 0, amount: 100 });
        expect(create().el.textContent).not.toContain('budget.safe.noLimits');

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
        hasLimits.set(false);
        expect(create().el.textContent).toContain('budget.safe.noLimits');
    });
});
