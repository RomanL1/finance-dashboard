import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import type { AccountDto } from '../../account.types';
import { AccountListComponent } from './account-list.component';

describe('AccountListComponent', () => {
    let fixture: ComponentFixture<AccountListComponent>;
    let translate: TranslateService;

    const mockAccounts: AccountDto[] = [
        {
            id: 'a-1',
            householdId: 'h-1',
            description: 'Checking',
            currency: 'EUR',
            initialValue: 10000,
            amount: 10050,
            startDate: '2026-01-01',
            archivedAt: null,
            createdAt: '2026-01-01T00:00:00Z',
        },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountListComponent],
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        }).compileComponents();

        translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', {
            account: {
                list: {
                    empty: 'No accounts yet.',
                    description: 'Description',
                    currency: 'Currency',
                    amount: 'Amount',
                },
            },
        });
        translate.use('en');

        fixture = TestBed.createComponent(AccountListComponent);
    });

    it('renders the empty state when there are no accounts', () => {
        fixture.componentRef.setInput('accounts', []);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('No accounts yet.');
    });

    it('renders account rows with amount converted from cents', () => {
        fixture.componentRef.setInput('accounts', mockAccounts);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const cells = compiled.querySelectorAll('tbody td');
        expect(cells[0].textContent).toBe('Checking');
        expect(cells[1].textContent).toBe('EUR');
        expect(cells[2].textContent?.trim()).toBe('100.50');
    });
});
