import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { AccountDto } from '../../account.types';
import { AccountManageListComponent } from './account-manage-list.component';

const account = (id: string, archivedAt: string | null = null): AccountDto => ({
    id,
    householdId: 'h1',
    number: 1,
    description: `Account ${id}`,
    type: 'savings',
    currency: 'CHF',
    initialValue: 0,
    amount: 1000,
    startDate: '2026-01-01T00:00:00.000Z',
    archivedAt,
    createdAt: '2026-01-01T00:00:00.000Z',
});

describe('AccountManageListComponent', () => {
    const accounts = signal<AccountDto[]>([]);

    function create() {
        const fixture = TestBed.createComponent(AccountManageListComponent, {
            bindings: [inputBinding('accounts', accounts)],
        });
        fixture.detectChanges();
        const events: string[] = [];
        const list = fixture.componentInstance;
        for (const name of [
            'edit',
            'archive',
            'unarchive',
            'remove',
        ] as const) {
            list[name].subscribe((id) => events.push(`${name}:${id}`));
        }
        const el = fixture.nativeElement as HTMLElement;
        /** Opens the row menu and returns its items, which render in the overlay. */
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
        return { fixture, el, events, menuOf };
    }

    beforeEach(() => {
        accounts.set([]);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('says so when there are no accounts', () => {
        const { el } = create();

        expect(el.textContent).toContain('account.list.empty');
        expect(el.querySelector('ul')).toBeNull();
    });

    it('dims archived accounts and shows type for active ones', () => {
        accounts.set([
            account('a1'),
            account('a2', '2020-01-01T00:00:00.000Z'),
        ]);
        const { el } = create();
        const rows = el.querySelectorAll('li');

        expect(rows[0].classList).not.toContain('opacity-60');
        expect(rows[0].textContent).toContain('account.type.savings');
        expect(rows[1].classList).toContain('opacity-60');
        expect(rows[1].textContent).toContain('account.manage.archivedSince');
    });

    it('offers archive for an active account', () => {
        accounts.set([account('a1')]);
        const { events, menuOf } = create();

        const items = menuOf(0);
        expect(items.map((b) => b.textContent!.trim())).toEqual([
            'edit account.manage.edit',
            'archive account.manage.archive',
            'delete account.manage.delete',
        ]);
        items[1].click();

        expect(events).toEqual(['archive:a1']);
    });

    it('offers unarchive for an archived account', () => {
        accounts.set([account('a2', '2020-01-01T00:00:00.000Z')]);
        const { events, menuOf } = create();

        const items = menuOf(0);
        items[1].click();

        expect(items[1].textContent).toContain('account.manage.unarchive');
        expect(events).toEqual(['unarchive:a2']);
    });

    it('emits edit and remove with the row id', () => {
        accounts.set([account('a1'), account('a3')]);
        const { events, menuOf } = create();

        menuOf(1)[0].click();
        menuOf(1)[2].click();

        expect(events).toEqual(['edit:a3', 'remove:a3']);
    });
});
