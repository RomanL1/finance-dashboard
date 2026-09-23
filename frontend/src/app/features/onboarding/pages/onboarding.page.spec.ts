import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import type { CreateAccountDto } from '../../account/account.types';
import {
    OnboardingStateService,
    type OnboardingDraft,
} from '../services/onboarding-state.service';
import { OnboardingService } from '../services/onboarding.service';
import { OnboardingPage } from './onboarding.page';

const account: CreateAccountDto = {
    description: 'Checking',
    type: 'checking',
    currency: 'CHF',
    initialValue: 0,
    startDate: '2026-01-01',
};

describe('OnboardingPage', () => {
    const draft = signal<OnboardingDraft>({ name: null, categories: null });
    let service: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, ReturnType<typeof vi.fn>>;
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        draft.set({ name: null, categories: null });
        service = {
            getDefaultCategories: vi.fn().mockResolvedValue([]),
            validateHousehold: vi.fn().mockResolvedValue(undefined),
            validateCategories: vi.fn().mockResolvedValue(undefined),
            validateAccounts: vi.fn().mockResolvedValue(undefined),
            submit: vi.fn().mockResolvedValue({ id: 'h1' }),
        };
        state = {
            setHousehold: vi.fn((name: string) =>
                draft.update((d) => ({ ...d, name })),
            ),
            setCategories: vi.fn(),
            clear: vi.fn(),
        };
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: OnboardingService, useValue: service },
                {
                    provide: OnboardingStateService,
                    useValue: { ...state, draft: draft.asReadonly() },
                },
            ],
        });
        TestBed.inject(TranslateService).setTranslation('en', {
            category: { default: { MISC: 'Miscellaneous' } },
        });
        navigate = vi
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
    });

    function create(): OnboardingPage {
        const fixture = TestBed.createComponent(OnboardingPage);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('stores a household name the server accepts', async () => {
        const page = create();

        await page.onHouseholdNameSubmit('Home');

        expect(service['validateHousehold']).toHaveBeenCalledWith('Home');
        expect(state['setHousehold']).toHaveBeenCalledWith('Home');
        expect(page.error()).toBeNull();
    });

    it('keeps a rejected name out of the draft', async () => {
        service['validateHousehold'].mockRejectedValue({ statusCode: 400 });
        const page = create();

        await page.onHouseholdNameSubmit(' ');

        expect(state['setHousehold']).not.toHaveBeenCalled();
        expect(page.error()).toBe('onboarding.failed');
        expect(page.busy()).toBe(false);
    });

    it('validates presets by their translated names plus custom ones', async () => {
        const page = create();
        const selection = { translateKeys: ['MISC'], customNames: ['Pets'] };

        await page.onCategoriesSubmit(selection);

        expect(service['validateCategories']).toHaveBeenCalledWith([
            'Miscellaneous',
            'Pets',
        ]);
        expect(state['setCategories']).toHaveBeenCalledWith(selection);
    });

    it('submits the whole household, clears the draft and goes home', async () => {
        draft.set({
            name: 'Home',
            categories: { translateKeys: ['MISC'], customNames: [] },
        });
        const page = create();

        await page.onAccountSubmit(account);

        expect(service['validateAccounts']).toHaveBeenCalledWith([account]);
        expect(service['submit']).toHaveBeenCalledWith({
            name: 'Home',
            categoryNames: ['Miscellaneous'],
            accounts: [account],
        });
        expect(state['clear']).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('does not submit an incomplete draft', async () => {
        draft.set({ name: 'Home', categories: null });
        const page = create();

        await page.onAccountSubmit(account);

        expect(service['submit']).not.toHaveBeenCalled();
    });

    it('keeps the draft when the final submit fails', async () => {
        draft.set({
            name: 'Home',
            categories: { translateKeys: [], customNames: ['Pets'] },
        });
        service['submit'].mockRejectedValue(new Error('Household exists'));
        const page = create();

        await page.onAccountSubmit(account);

        expect(state['clear']).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expect(page.error()).toBe('Household exists');
    });
});
