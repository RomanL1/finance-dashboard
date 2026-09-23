import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { CategoryDto } from '../../category.types';
import { CategoryManageListComponent } from './category-manage-list.component';

const category = (id: string, name: string, count: number): CategoryDto => ({
    id,
    name,
    createdAt: '',
    transactionCount: count,
});

describe('CategoryManageListComponent', () => {
    const categories = signal<CategoryDto[]>([]);

    function create() {
        const fixture = TestBed.createComponent(CategoryManageListComponent, {
            bindings: [inputBinding('categories', categories)],
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
        const menuOf = (row: number): HTMLButtonElement[] => {
            el.querySelectorAll<HTMLButtonElement>('app-icon-button button')[
                row
            ].click();
            fixture.detectChanges();
            return Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                    '.mat-mdc-menu-panel button[mat-menu-item]',
                ),
            );
        };
        return { el, events, menuOf };
    }

    beforeEach(() => {
        categories.set([]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('says so when there are no categories', () => {
        expect(create().el.textContent).toContain('category.list.empty');
    });

    it('lists the most used first, ties by name, without mutating the input', () => {
        const input = [
            category('c1', 'Rent', 1),
            category('c2', 'Food', 5),
            category('c3', 'Bills', 1),
        ];
        categories.set(input);
        const { el } = create();

        const names = Array.from(el.querySelectorAll('li')).map((li) =>
            li.querySelector('p')!.textContent!.trim(),
        );
        expect(names).toEqual(['Food', 'Bills', 'Rent']);
        expect(input.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('emits edit and remove for the chosen row', () => {
        categories.set([category('c1', 'Rent', 0), category('c2', 'Food', 5)]);
        const { events, menuOf } = create();

        menuOf(0)[0].click();
        menuOf(1)[1].click();

        expect(events).toEqual(['edit:c2', 'remove:c1']);
    });
});
