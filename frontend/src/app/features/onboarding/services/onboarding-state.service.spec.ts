import { TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../../testing/local-storage';
import { OnboardingStateService } from './onboarding-state.service';

const KEY = 'onboarding-draft';

describe('OnboardingStateService', () => {
    let storage: Storage;

    beforeEach(() => {
        storage = stubLocalStorage();
    });

    afterEach(() => vi.unstubAllGlobals());

    it('starts empty', () => {
        expect(TestBed.inject(OnboardingStateService).draft()).toEqual({
            name: null,
            categories: null,
        });
    });

    it('keeps every answer and persists the draft', () => {
        const state = TestBed.inject(OnboardingStateService);
        const categories = { translateKeys: ['MISC'], customNames: ['Pets'] };

        state.setHousehold('Home');
        state.setCategories(categories);

        expect(state.draft()).toEqual({ name: 'Home', categories });
        expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
            name: 'Home',
            categories,
        });
    });

    it('restores a stored draft', () => {
        localStorage.setItem(KEY, JSON.stringify({ name: 'Home' }));

        expect(TestBed.inject(OnboardingStateService).draft()).toEqual({
            name: 'Home',
            categories: null,
        });
    });

    it('ignores a corrupt draft', () => {
        localStorage.setItem(KEY, '{not json');

        expect(TestBed.inject(OnboardingStateService).draft().name).toBeNull();
    });

    it('clear forgets the draft', () => {
        const state = TestBed.inject(OnboardingStateService);
        state.setHousehold('Home');

        state.clear();

        expect(state.draft()).toEqual({ name: null, categories: null });
        expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('keeps working in memory when storage is unavailable', () => {
        storage.setItem = () => {
            throw new Error('QuotaExceededError');
        };
        const state = TestBed.inject(OnboardingStateService);

        state.setHousehold('Home');

        expect(state.draft().name).toBe('Home');
    });
});
