import { TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../testing/local-storage';
import { ThemeService, type ThemePreference } from './theme.service';

/** Controllable `(prefers-color-scheme: dark)`. */
function stubSystemDark(matches: boolean) {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    vi.stubGlobal('matchMedia', () => ({
        matches,
        addEventListener: (
            _type: string,
            fn: (event: { matches: boolean }) => void,
        ) => (listener = fn),
    }));
    return (next: boolean) => listener?.({ matches: next });
}

describe('ThemeService', () => {
    let storage: Storage;

    beforeEach(() => {
        storage = stubLocalStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.style.colorScheme = '';
    });

    it('follows the system by default', () => {
        const systemChanges = stubSystemDark(true);
        const theme = TestBed.inject(ThemeService);
        TestBed.tick();

        expect(theme.preference()).toBe('system');
        expect(theme.resolved()).toBe('dark');
        expect(document.body.style.colorScheme).toBe('light dark');

        systemChanges(false);
        expect(theme.resolved()).toBe('light');
    });

    it('restores a stored preference and ignores garbage', () => {
        stubSystemDark(false);
        storage.setItem('theme', 'dark');
        expect(TestBed.inject(ThemeService).resolved()).toBe('dark');

        TestBed.resetTestingModule();
        storage.setItem('theme', 'sepia');
        expect(TestBed.inject(ThemeService).preference()).toBe('system');
    });

    it.each<[ThemePreference, string]>([
        ['light', 'light'],
        ['dark', 'dark'],
    ])(
        'an explicit %s choice overrides the system, applies and persists',
        (preference, scheme) => {
            stubSystemDark(preference === 'light');
            const theme = TestBed.inject(ThemeService);

            theme.set(preference);
            TestBed.tick();

            expect(theme.resolved()).toBe(preference);
            expect(document.body.style.colorScheme).toBe(scheme);
            expect(storage.getItem('theme')).toBe(preference);
        },
    );
});
