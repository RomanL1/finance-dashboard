import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { TransferRow } from '../../transfer.types';
import { TransferListComponent } from './transfer-list.component';

const row: TransferRow = {
    id: 't1',
    date: '2026-02-01T12:00:00.000Z',
    when: '01.02.26 13:00',
    title: null,
    fromNumber: 1,
    fromName: 'Checking',
    toNumber: 2,
    toName: 'Visa',
    currency: 'CHF',
    amount: 2000,
};

describe('TransferListComponent', () => {
    const rows = signal<TransferRow[]>([]);

    function create() {
        const fixture = TestBed.createComponent(TransferListComponent, {
            bindings: [inputBinding('rows', rows)],
        });
        fixture.detectChanges();
        const edited: string[] = [];
        fixture.componentInstance.edit.subscribe((id) => edited.push(id));
        return { el: fixture.nativeElement as HTMLElement, edited };
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('says so when there are no transfers', () => {
        rows.set([]);
        expect(create().el.textContent).toContain('transfer.list.empty');
    });

    it('shows both accounts and an unsigned amount, and edits on tap', () => {
        rows.set([row]);
        const { el, edited } = create();
        const text = el.textContent ?? '';

        expect(text).toContain('Checking');
        expect(text).toContain('Visa');
        expect(text).toContain('transfer.list.untitled');
        expect(text).toContain('20.00');
        expect(text).not.toContain('−');

        el.querySelector('button')!.click();
        expect(edited).toEqual(['t1']);
    });
});
