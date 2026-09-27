import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { By } from '@angular/platform-browser';
import { provideTranslateService } from '@ngx-translate/core';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import { UNCATEGORIZED, type TransactionFilter } from '../../transaction.types';
import { TransactionFilterComponent } from './transaction-filter.component';

describe('TransactionFilterComponent', () => {
    const filter = signal<TransactionFilter>({});

    function create() {
        const fixture = TestBed.createComponent(TransactionFilterComponent, {
            bindings: [
                inputBinding('accounts', () => [
                    { id: 'a1', description: 'Checking' } as AccountDto,
                ]),
                inputBinding('categories', () => [
                    { id: 'c1', name: 'Food' } as CategoryDto,
                ]),
                inputBinding('filter', filter),
            ],
        });
        fixture.detectChanges();
        const emitted: TransactionFilter[] = [];
        fixture.componentInstance.filterChange.subscribe((v) =>
            emitted.push(v),
        );
        const [accountSelect, categorySelect] = fixture.debugElement
            .queryAll(By.directive(MatSelect))
            .map((d) => d.componentInstance as MatSelect);
        const toggle = fixture.debugElement.query(By.directive(MatSlideToggle))
            .componentInstance as MatSlideToggle;
        return { emitted, accountSelect, categorySelect, toggle };
    }

    beforeEach(() => {
        filter.set({});
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('shows "all" for an unrestricted filter', () => {
        const { accountSelect, categorySelect } = create();

        expect(accountSelect.value).toBe('');
        expect(categorySelect.value).toBe('');
    });

    it('reflects the current filter', () => {
        filter.set({ accountId: 'a1', categoryId: UNCATEGORIZED });
        const { accountSelect, categorySelect } = create();

        expect(accountSelect.value).toBe('a1');
        expect(categorySelect.value).toBe(UNCATEGORIZED);
    });

    it('emits the whole filter, keeping the other field', () => {
        filter.set({ accountId: 'a1' });
        const { emitted, categorySelect } = create();

        categorySelect.valueChange.emit('c1');

        expect(emitted).toEqual([{ accountId: 'a1', categoryId: 'c1' }]);
    });

    it('turns "all" back into no restriction', () => {
        filter.set({ accountId: 'a1', categoryId: 'c1' });
        const { emitted, accountSelect } = create();

        accountSelect.valueChange.emit('');

        expect(emitted).toEqual([{ accountId: undefined, categoryId: 'c1' }]);
    });

    it('toggles the needs-confirmation restriction', () => {
        filter.set({ accountId: 'a1', needsConfirmation: true });
        const { emitted, toggle } = create();

        expect(toggle.checked).toBe(true);
        toggle.change.emit({ checked: false, source: toggle });
        toggle.change.emit({ checked: true, source: toggle });

        expect(emitted).toEqual([
            { accountId: 'a1', needsConfirmation: undefined },
            { accountId: 'a1', needsConfirmation: true },
        ]);
    });
});
