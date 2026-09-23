import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { BudgetTotals } from '../../budget.types';
import { BudgetSummaryComponent } from './budget-summary.component';

const totals = (limit: number, spent: number): BudgetTotals => ({
    budgeted: 2,
    limit,
    spent,
    remaining: limit - spent,
});

describe('BudgetSummaryComponent', () => {
    const value = signal<BudgetTotals>(totals(0, 0));

    function create() {
        const fixture = TestBed.createComponent(BudgetSummaryComponent, {
            bindings: [
                inputBinding('totals', value),
                inputBinding('currency', () => 'CHF'),
            ],
        });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        return {
            el,
            label: el.querySelector('.text-right dt')!.textContent!.trim(),
            bar: el.querySelector<HTMLElement>('[role="img"] > div')!,
        };
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it.each([
        [
            'plenty left',
            10000,
            5000,
            'budget.summary.left',
            'bg-primary',
            '50%',
        ],
        [
            'under 20% left',
            10000,
            9000,
            'budget.summary.low',
            'bg-warning',
            '90%',
        ],
        [
            'met exactly',
            10000,
            10000,
            'budget.summary.usedUp',
            'bg-used-up',
            '100%',
        ],
        ['exceeded', 10000, 15000, 'budget.summary.over', 'bg-expense', '100%'],
        [
            'a zero total with spending',
            0,
            100,
            'budget.summary.over',
            'bg-expense',
            '100%',
        ],
        [
            'a zero total untouched',
            0,
            0,
            'budget.summary.left',
            'bg-primary',
            '0%',
        ],
    ])('reads %s', (_case, limit, spent, expectedLabel, barClass, width) => {
        value.set(totals(limit, spent));
        const { label, bar } = create();

        expect(label).toBe(expectedLabel);
        expect(bar.classList).toContain(barClass);
        expect(bar.style.width).toBe(width);
    });

    it('says how many categories are budgeted', () => {
        value.set(totals(100, 0));
        const { el } = create();

        expect(el.textContent).toContain('budget.summary.budgeted');
    });
});
