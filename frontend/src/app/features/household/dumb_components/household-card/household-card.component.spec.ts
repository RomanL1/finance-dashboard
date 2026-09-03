import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { HouseholdCardComponent } from './household-card.component';
import type { HouseholdMineResponse } from '../../household.types';

describe('HouseholdCardComponent', () => {
    let fixture: ComponentFixture<HouseholdCardComponent>;
    let translate: TranslateService;

    const mockHousehold: HouseholdMineResponse = {
        id: 'h-1',
        name: 'Our Home',
        currency: 'EUR',
        role: 'owner',
        createdAt: '2026-01-01T00:00:00Z',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HouseholdCardComponent],
            providers: [
                provideTranslateService({
                    fallbackLang: 'en',
                    lang: 'en',
                }),
            ],
        }).compileComponents();

        translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', {
            household: {
                card: {
                    household: 'Household',
                    currency: 'Currency',
                    role: 'Role',
                },
            },
        });
        translate.use('en');

        fixture = TestBed.createComponent(HouseholdCardComponent);
        fixture.componentRef.setInput('household', mockHousehold);
        fixture.detectChanges();
    });

    it('should render translated labels and household details', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const dts = compiled.querySelectorAll('dt');
        expect(dts[0].textContent).toBe('Household');
        expect(dts[1].textContent).toBe('Currency');
        expect(dts[2].textContent).toBe('Role');

        const dds = compiled.querySelectorAll('dd');
        expect(dds[0].textContent).toBe('Our Home');
        expect(dds[1].textContent).toBe('EUR');
        expect(dds[2].textContent).toBe('owner');
    });
});
