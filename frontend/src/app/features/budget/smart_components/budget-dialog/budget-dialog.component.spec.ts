import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import type { BudgetDialogData } from '../../budget.types';
import { BudgetService } from '../../services/budget.service';
import { BudgetDialogComponent } from './budget-dialog.component';

const data = (amount: number | null): BudgetDialogData => ({
    householdId: 'h1',
    month: '2026-09',
    currency: 'CHF',
    row: {
        category: {
            id: 'c1',
            name: 'Food',
            createdAt: '',
            transactionCount: 0,
        },
        amount,
        spent: 0,
        remaining: amount,
    },
});

describe('BudgetDialogComponent', () => {
    let budgets: {
        set: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let close: ReturnType<typeof vi.fn>;

    function create(dialogData: BudgetDialogData) {
        budgets = {
            set: vi.fn().mockResolvedValue({}),
            remove: vi.fn().mockResolvedValue(undefined),
        };
        close = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
                { provide: MatDialogRef, useValue: { close } },
                { provide: BudgetService, useValue: budgets },
            ],
        });
        const fixture = TestBed.createComponent(BudgetDialogComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        return { dialog: fixture.componentInstance, el };
    }

    it('sets the limit and closes with the amount', async () => {
        const { dialog } = create(data(null));

        await dialog.save(2500);

        expect(budgets.set).toHaveBeenCalledWith('h1', 'c1', '2026-09', 2500);
        expect(close).toHaveBeenCalledWith({ amount: 2500 });
    });

    it('offers remove only for an existing limit', () => {
        expect(create(data(null)).el.textContent).not.toContain(
            'budget.dialog.remove',
        );
        TestBed.resetTestingModule();
        expect(create(data(500)).el.textContent).toContain(
            'budget.dialog.remove',
        );
    });

    it('removes the limit and closes with null', async () => {
        const { dialog } = create(data(500));

        await dialog.remove();

        expect(budgets.remove).toHaveBeenCalledWith('h1', 'c1', '2026-09');
        expect(close).toHaveBeenCalledWith({ amount: null });
    });

    it.each(['save', 'remove'] as const)(
        'stays open with an error when %s fails',
        async (action) => {
            const { dialog } = create(data(500));
            budgets.set.mockRejectedValue(new Error('boom'));
            budgets.remove.mockRejectedValue(new Error('boom'));

            await (action === 'save' ? dialog.save(1) : dialog.remove());

            expect(close).not.toHaveBeenCalled();
            expect(dialog.error()).toBe('budget.dialog.failed');
            expect(dialog.busy()).toBe(false);
        },
    );
});
