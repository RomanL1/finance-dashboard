import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { BudgetRow } from '../../budget.types';
import { BudgetListComponent } from './budget-list.component';

const row = (id: string, amount: number | null, spent: number): BudgetRow => ({
    category: { id, name: id, createdAt: '', transactionCount: 0 },
    amount,
    spent,
    remaining: amount === null ? null : amount - spent,
});

describe('BudgetListComponent', () => {
    const rows = signal<BudgetRow[]>([]);

    function create() {
        const fixture = TestBed.createComponent(BudgetListComponent, {
            bindings: [
                inputBinding('rows', rows),
                inputBinding('currency', () => 'CHF'),
            ],
        });
        fixture.detectChanges();
        const edited: BudgetRow[] = [];
        fixture.componentInstance.edit.subscribe((r) => edited.push(r));
        const el = fixture.nativeElement as HTMLElement;
        const item = (i: number) => el.querySelectorAll('li')[i];
        const bar = (i: number) =>
            item(i).querySelector<HTMLElement>('[role="img"] > span');
        return { el, edited, item, bar };
    }

    beforeEach(() => {
        rows.set([]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('says so when there are no categories', () => {
        expect(create().el.textContent).toContain('budget.list.empty');
    });

    it('shows no bar for a category without a limit', () => {
        rows.set([row('a', null, 500)]);
        const { item, bar } = create();

        expect(item(0).textContent).toContain('budget.list.noLimit');
        expect(bar(0)).toBeNull();
    });

    it.each([
        ['plenty left', 10000, 2000, 'budget.list.left', 'bg-primary', '20%'],
        ['under 20% left', 10000, 8500, 'budget.list.low', 'bg-warning', '85%'],
        [
            'met exactly',
            10000,
            10000,
            'budget.list.usedUp',
            'bg-used-up',
            '100%',
        ],
        ['exceeded', 10000, 12000, 'budget.list.over', 'bg-expense', '100%'],
        [
            'a zero limit untouched',
            0,
            0,
            'budget.list.left',
            'bg-primary',
            '0%',
        ],
    ])(
        'marks a limit with %s',
        (_case, amount, spent, label, barClass, width) => {
            rows.set([row('a', amount, spent)]);
            const { item, bar } = create();

            expect(item(0).textContent).toContain(label);
            expect(bar(0)!.classList).toContain(barClass);
            expect(bar(0)!.style.width).toBe(width);
        },
    );

    it('emits the row that was tapped', () => {
        const target = row('b', 500, 0);
        rows.set([row('a', null, 0), target]);
        const { item, edited } = create();

        item(1).querySelector('button')!.click();

        expect(edited).toEqual([target]);
    });
});
