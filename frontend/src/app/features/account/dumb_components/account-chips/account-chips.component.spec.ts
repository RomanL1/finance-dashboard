import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { AccountDto } from '../../account.types';
import { AccountChipsComponent } from './account-chips.component';

describe('AccountChipsComponent', () => {
    const accounts = signal<AccountDto[]>([]);

    function create(): HTMLElement {
        const fixture = TestBed.createComponent(AccountChipsComponent, {
            bindings: [inputBinding('accounts', accounts)],
        });
        fixture.detectChanges();
        return fixture.nativeElement;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('says so when there are no accounts', () => {
        accounts.set([]);
        expect(create().textContent).toContain('account.list.empty');
    });

    it('renders one chip per account with its name', () => {
        accounts.set([
            {
                id: 'a1',
                number: 1,
                description: 'Checking',
                amount: 100,
                currency: 'CHF',
            },
            {
                id: 'a2',
                number: 2,
                description: 'Savings',
                amount: 200,
                currency: 'CHF',
            },
        ] as AccountDto[]);
        const chips = create().querySelectorAll('li');

        expect(chips).toHaveLength(2);
        expect(chips[1].textContent).toContain('Savings');
    });
});
