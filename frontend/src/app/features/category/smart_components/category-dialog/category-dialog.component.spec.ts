import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import type { CategoryDialogData, CategoryDto } from '../../category.types';
import { CategoryService } from '../../services/category.service';
import { CategoryDialogComponent } from './category-dialog.component';

describe('CategoryDialogComponent', () => {
    let categories: {
        create: ReturnType<typeof vi.fn>;
        rename: ReturnType<typeof vi.fn>;
    };
    let close: ReturnType<typeof vi.fn>;

    function create(data: CategoryDialogData): CategoryDialogComponent {
        categories = {
            create: vi.fn().mockResolvedValue({ id: 'new' }),
            rename: vi.fn().mockResolvedValue({ id: 'c1' }),
        };
        close = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close } },
                { provide: CategoryService, useValue: categories },
            ],
        });
        const fixture = TestBed.createComponent(CategoryDialogComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('creates a category and closes with it', async () => {
        const dialog = create({ householdId: 'h1' });

        await dialog.save({ name: 'Pets' });

        expect(categories.create).toHaveBeenCalledWith('h1', { name: 'Pets' });
        expect(close).toHaveBeenCalledWith({ id: 'new' });
    });

    it('renames an existing category', async () => {
        const dialog = create({
            householdId: 'h1',
            category: { id: 'c1', name: 'Food' } as CategoryDto,
        });

        await dialog.save({ name: 'Groceries' });

        expect(categories.rename).toHaveBeenCalledWith('h1', 'c1', {
            name: 'Groceries',
        });
        expect(close).toHaveBeenCalledWith({ id: 'c1' });
    });

    it.each([
        [
            'a duplicate name',
            { statusCode: 409, message: 'exists' },
            'category.dialog.duplicate',
        ],
        ['any other failure', { statusCode: 500 }, 'category.dialog.failed'],
        [
            'a network error',
            new TypeError('fetch failed'),
            'category.dialog.failed',
        ],
    ])('explains %s and stays open', async (_case, failure, message) => {
        const dialog = create({ householdId: 'h1' });
        categories.create.mockRejectedValue(failure);

        await dialog.save({ name: 'Food' });

        expect(close).not.toHaveBeenCalled();
        expect(dialog.error()).toBe(message);
        expect(dialog.busy()).toBe(false);
    });
});
