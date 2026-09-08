import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { vi, type Mock } from 'vitest';
import type {
    CategoryDeleteDialogData,
    CategoryDto,
} from '../../category.types';
import { CategoryDeleteDialogComponent } from './category-delete-dialog.component';

const category = (id: string, transactionCount = 0): CategoryDto => ({
    id,
    name: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    transactionCount,
});

describe('CategoryDeleteDialogComponent', () => {
    let fixture: ComponentFixture<CategoryDeleteDialogComponent>;
    let close: Mock;

    async function setup(data: CategoryDeleteDialogData): Promise<void> {
        close = vi.fn();
        await TestBed.configureTestingModule({
            imports: [CategoryDeleteDialogComponent],
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close } },
            ],
        }).compileComponents();
        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(CategoryDeleteDialogComponent);
        fixture.detectChanges();
    }

    const buttons = (): HTMLButtonElement[] =>
        Array.from(fixture.nativeElement.querySelectorAll('button'));

    it('closes with a null transfer when uncategorizing', async () => {
        await setup({ category: category('a', 3), others: [category('b')] });

        fixture.componentInstance.uncategorize();

        expect(close).toHaveBeenCalledWith({ transferTo: null });
    });

    it('enables transfer and disables uncategorize once a target is chosen', async () => {
        await setup({ category: category('a', 3), others: [category('b')] });

        expect(buttons().length).toBe(3);
        expect(buttons()[2].disabled).toBe(true);

        fixture.componentInstance.transferTo.set('b');
        fixture.detectChanges();

        expect(buttons()[2].disabled).toBe(false);
        expect(buttons()[1].disabled).toBe(true);
        fixture.componentInstance.transfer();
        expect(close).toHaveBeenCalledWith({ transferTo: 'b' });
    });

    it('offers no transfer when there is no other category', async () => {
        await setup({ category: category('a', 3), others: [] });

        expect(buttons().length).toBe(2);
        expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
    });
});
