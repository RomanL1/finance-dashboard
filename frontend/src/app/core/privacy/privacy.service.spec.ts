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

    it('shows everything by default', () => {
        const privacy = TestBed.inject(PrivacyService);
        expect(privacy.isHidden('balance')).toBe(false);
        expect(privacy.isHidden('transaction')).toBe(false);
    });

    it('restores stored choices and ignores garbage', () => {
        storage.setItem('hideBalances', 'true');
        storage.setItem('hideTransactions', 'yes');
        const privacy = TestBed.inject(PrivacyService);

        expect(privacy.hideBalances()).toBe(true);
        expect(privacy.hideTransactions()).toBe(false);
    });

    it('hides balances and transactions independently and persists both', () => {
        const privacy = TestBed.inject(PrivacyService);

        privacy.setHideTransactions(true);
        TestBed.tick();

        expect(privacy.isHidden('balance')).toBe(false);
        expect(privacy.isHidden('transaction')).toBe(true);
        expect(storage.getItem('hideBalances')).toBe('false');
        expect(storage.getItem('hideTransactions')).toBe('true');
    });
});
