import { inputBinding, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CategoryAvatarComponent } from './category-avatar.component';

describe('CategoryAvatarComponent', () => {
    function avatar(
        categoryId: string | null,
        name: string | null,
        locale = 'en',
    ): HTMLElement {
        TestBed.configureTestingModule({
            providers: [{ provide: LOCALE_ID, useValue: locale }],
        });
        const fixture = TestBed.createComponent(CategoryAvatarComponent, {
            bindings: [
                inputBinding('categoryId', () => categoryId),
                inputBinding('name', () => name),
            ],
        });
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('span');
    }

    it('shows the upper-cased initial on the category hue', () => {
        const el = avatar('cat-1', '  groceries');

        expect(el.textContent!.trim()).toBe('G');
        expect(el.getAttribute('style')).toContain('light-dark(');
    });

    it('keeps a multi-unit first character whole', () => {
        expect(avatar('cat-1', '🍕 Pizza').textContent!.trim()).toBe('🍕');
    });

    it('upper-cases in the app locale', () => {
        expect(avatar('cat-1', 'istanbul', 'tr').textContent!.trim()).toBe('İ');
    });

    it('falls back to a question mark without a name', () => {
        expect(avatar('cat-1', ' ').textContent!.trim()).toBe('?');
    });

    it('shows a neutral icon for uncategorized entries', () => {
        const el = avatar(null, null);

        expect(el.querySelector('mat-icon')!.textContent).toBe('label');
        expect(el.getAttribute('style')).toBeNull();
    });
});
