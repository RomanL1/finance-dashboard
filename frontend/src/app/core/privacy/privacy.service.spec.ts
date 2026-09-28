import { TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../testing/local-storage';
import { PrivacyService } from './privacy.service';

describe('PrivacyService', () => {
    let storage: Storage;

    beforeEach(() => {
        storage = stubLocalStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('shows amounts by default', () => {
        expect(TestBed.inject(PrivacyService).hideAmounts()).toBe(false);
    });

    it('restores a stored choice and ignores garbage', () => {
        storage.setItem('hideAmounts', 'true');
        expect(TestBed.inject(PrivacyService).hideAmounts()).toBe(true);

        TestBed.resetTestingModule();
        storage.setItem('hideAmounts', 'yes');
        expect(TestBed.inject(PrivacyService).hideAmounts()).toBe(false);
    });

    it('persists a change', () => {
        const privacy = TestBed.inject(PrivacyService);

        privacy.setHideAmounts(true);
        TestBed.tick();

        expect(storage.getItem('hideAmounts')).toBe('true');
    });
});
