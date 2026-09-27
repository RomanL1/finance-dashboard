import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { RecurringRow } from '../../recurring.types';
import { RecurringListComponent } from './recurring-list.component';

const row = (id: string, patch: Partial<RecurringRow> = {}): RecurringRow => ({
    id,
    categoryId: 'c1',
    category: 'Housing',
    title: 'Rent',
    accountNumber: 1,
    accountName: 'Checking',
    currency: 'CHF',
    amount: -180000,
    varyingAmount: false,
    interval: 'monthly',
    anchor: 1,
    weekendShift: false,
    paused: false,
    nextDate: '2026-10-01',
    ...patch,
});

describe('RecurringListComponent', () => {
    const rows = signal<RecurringRow[]>([]);

    function create() {
        const fixture = TestBed.createComponent(RecurringListComponent, {
            bindings: [inputBinding('rows', rows)],
        });
        fixture.detectChanges();
        const events: string[] = [];
        fixture.componentInstance.edit.subscribe((id) =>
            events.push(`edit:${id}`),
        );
        fixture.componentInstance.togglePaused.subscribe((r) =>
            events.push(`toggle:${r.id}`),
        );
        return { el: fixture.nativeElement as HTMLElement, events };
    }

    beforeEach(() => {
        rows.set([]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('shows the empty state without rules', () => {
        const { el } = create();
        expect(el.textContent).toContain('recurring.list.empty');
    });

    it('shows the next date, or paused', () => {
        rows.set([row('r1'), row('r2', { paused: true })]);
        const { el } = create();
        const items = el.querySelectorAll('li');

        expect(items[0].textContent).toContain('recurring.list.next');
        expect(items[1].textContent).toContain('recurring.list.paused');
        expect(items[1].classList).toContain('opacity-60');
    });

    it('marks varying amounts and weekend shifts', () => {
        rows.set([row('r1', { varyingAmount: true, weekendShift: true })]);
        const { el } = create();
        const text = el.querySelector('li')!.textContent!;

        expect(text).toContain('recurring.list.approx');
        expect(text).toContain('recurring.list.weekendShift');
    });

    it('edits on row tap and pauses or resumes from the trailing button', () => {
        rows.set([row('r1'), row('r2', { paused: true })]);
        const { el, events } = create();

        el.querySelectorAll<HTMLButtonElement>('li > button')[1]!.click();
        el.querySelector<HTMLButtonElement>(
            'button[aria-label="recurring.list.pause"]',
        )!.click();
        el.querySelector<HTMLButtonElement>(
            'button[aria-label="recurring.list.resume"]',
        )!.click();

        expect(events).toEqual(['edit:r2', 'toggle:r1', 'toggle:r2']);
    });
});
