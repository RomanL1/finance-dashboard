import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { TransactionGroup, TransactionRow } from '../../transaction.types';
import { TransactionListComponent } from './transaction-list.component';

const row = (
    id: string,
    patch: Partial<TransactionRow> = {},
): TransactionRow => ({
    id,
    date: '2026-09-15T08:30:00.000Z',
    when: '08:30',
    categoryId: 'c1',
    category: 'Food',
    accountNumber: 1,
    accountName: 'Checking',
    title: 'Groceries',
    currency: 'CHF',
    amount: -1250,
    ...patch,
});

describe('TransactionListComponent', () => {
    const groups = signal<TransactionGroup[]>([]);

    function create() {
        const fixture = TestBed.createComponent(TransactionListComponent, {
            bindings: [inputBinding('groups', groups)],
        });
        fixture.detectChanges();
        const events: string[] = [];
        fixture.componentInstance.edit.subscribe((id) =>
            events.push(`edit:${id}`),
        );
        fixture.componentInstance.remove.subscribe((id) =>
            events.push(`remove:${id}`),
        );
        const el = fixture.nativeElement as HTMLElement;
        return { fixture, el, events };
    }

    beforeEach(() => {
        groups.set([]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('shows the empty state without groups', () => {
        const { el } = create();

        expect(el.textContent).toContain('transaction.list.empty');
        expect(el.querySelector('section')).toBeNull();
    });

    it('titles groups by kind and past groups by year', () => {
        groups.set([
            { kind: 'today', rows: [row('t1')] },
            { kind: 'past', year: 2024, rows: [row('t2')] },
        ]);
        const { el } = create();

        const headings = Array.from(el.querySelectorAll('h3')).map((h) =>
            h.textContent!.trim(),
        );
        expect(headings).toEqual(['transaction.list.group.today', '2024']);
    });

    it('collapses upcoming entries until expanded', () => {
        groups.set([{ kind: 'upcoming', rows: [row('t1'), row('t2')] }]);
        const { fixture, el } = create();
        const toggle = el.querySelector<HTMLButtonElement>(
            'button[aria-expanded]',
        )!;
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(el.querySelectorAll('li')).toHaveLength(0);

        toggle.click();
        fixture.detectChanges();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(el.querySelectorAll('li')).toHaveLength(2);
    });

    it('names the category only when the title differs from it', () => {
        groups.set([
            {
                kind: 'today',
                rows: [
                    row('t1'),
                    row('t2', { title: 'Food' }),
                    row('t3', {
                        title: null,
                        category: null,
                        categoryId: null,
                    }),
                ],
            },
        ]);
        const { el } = create();
        const subtitle = (i: number) =>
            el.querySelectorAll('li')[i].querySelectorAll('p')[1].textContent!;

        expect(subtitle(0)).toContain('Food');
        expect(subtitle(1)).not.toContain('Food');
        expect(el.querySelectorAll('li')[2].textContent).toContain(
            'transaction.list.uncategorized',
        );
    });

    it('emits edit and delete for the row whose menu was opened', () => {
        groups.set([{ kind: 'today', rows: [row('t1'), row('t2')] }]);
        const { fixture, el, events } = create();
        const menuOf = (i: number) => {
            el.querySelectorAll<HTMLButtonElement>('app-icon-button button')[
                i
            ].click();
            fixture.detectChanges();
            return document.querySelectorAll<HTMLButtonElement>(
                '.mat-mdc-menu-panel button[mat-menu-item]',
            );
        };

        menuOf(1)[0].click();
        menuOf(0)[1].click();

        expect(events).toEqual(['edit:t2', 'remove:t1']);
    });
});
