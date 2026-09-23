import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../testing/local-storage';
import { LanguageService, restoreLanguage } from './language.service';

describe('restoreLanguage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('returns a stored supported language', () => {
        stubLocalStorage().setItem('language', 'de');
        expect(restoreLanguage()).toBe('de');
    });

    it.each([null, 'fr', ''])('falls back to English for %j', (stored) => {
        const storage = stubLocalStorage();
        if (stored !== null) storage.setItem('language', stored);
        expect(restoreLanguage()).toBe('en');
    });

    it('falls back to English when storage is blocked', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => {
                throw new Error('SecurityError');
            },
        });
        expect(restoreLanguage()).toBe('en');
    });
});

describe('LanguageService', () => {
    let storage: Storage;
    let reload: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        storage = stubLocalStorage();
        reload = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DOCUMENT,
                    useValue: { location: { reload } },
                },
            ],
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('persists a new language and reloads to apply it', () => {
        TestBed.inject(LanguageService).set('de');

        expect(storage.getItem('language')).toBe('de');
        expect(reload).toHaveBeenCalledOnce();
    });

    it('does nothing for the current language', () => {
        const service = TestBed.inject(LanguageService);
        service.set(service.current);

        expect(storage.getItem('language')).toBeNull();
        expect(reload).not.toHaveBeenCalled();
    });

    it('skips the reload when the choice cannot be stored', () => {
        storage.setItem = () => {
            throw new Error('QuotaExceededError');
        };

        TestBed.inject(LanguageService).set('de');

        expect(reload).not.toHaveBeenCalled();
    });
});
