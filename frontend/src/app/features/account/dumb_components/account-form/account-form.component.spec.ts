import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import type { CreateAccountDto } from '../../account.types';
import { AccountFormComponent } from './account-form.component';

describe('AccountFormComponent', () => {
    let fixture: ComponentFixture<AccountFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountFormComponent],
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        }).compileComponents();

        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', {
            account: {
                form: {
                    descriptionLabel: 'Description',
                    descriptionRequired: 'Description is required',
                    currencyLabel: 'Currency',
                    initialValueLabel: 'Initial value',
                    initialValueRequired: 'Initial value is required',
                    startDateLabel: 'Start date',
                    startDateRequired: 'Start date is required',
                    submit: 'Add account',
                },
            },
        });
        translate.use('en');

        fixture = TestBed.createComponent(AccountFormComponent);
        fixture.detectChanges();
    });

    it('defaults the currency control to CHF', () => {
        expect(fixture.componentInstance.form.controls.currency.value).toBe(
            'CHF',
        );
    });

    it('disables submit while the form is invalid', () => {
        const button = fixture.nativeElement.querySelector(
            'button[type="submit"]',
        ) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('converts the entered decimal amount to cents on submit', () => {
        let emitted: CreateAccountDto | undefined;
        fixture.componentInstance.submitted.subscribe(
            (dto: CreateAccountDto) => {
                emitted = dto;
            },
        );

        fixture.componentInstance.form.setValue({
            description: '  Checking  ',
            currency: 'EUR',
            initialValue: 100.5,
            startDate: '2026-01-01',
        });
        fixture.componentInstance.submit();

        expect(emitted).toEqual({
            description: 'Checking',
            currency: 'EUR',
            initialValue: 10050,
            startDate: '2026-01-01',
        });
    });

    it('does not emit when the form is invalid', () => {
        let emitted = false;
        fixture.componentInstance.submitted.subscribe(() => {
            emitted = true;
        });

        fixture.componentInstance.submit();

        expect(emitted).toBe(false);
    });
});
