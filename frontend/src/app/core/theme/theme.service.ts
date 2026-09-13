import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Light / dark / follow-system. Material and every app token are `light-dark()` pairs, so
 * the whole theme switches by setting `color-scheme` on `<body>`. Persisted per browser.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);
    readonly preference = signal<ThemePreference>(this.restore());
    private readonly systemDark = signal(this.matchDark()?.matches ?? false);
    /** What is actually on screen. Canvas drawings cannot use `light-dark()`, so they read this. */
    readonly resolved = computed<'light' | 'dark'>(() => {
        const preference = this.preference();
        if (preference !== 'system') return preference;
        return this.systemDark() ? 'dark' : 'light';
    });

    constructor() {
        this.matchDark()?.addEventListener('change', (event) =>
            this.systemDark.set(event.matches),
        );
        effect(() => {
            const preference = this.preference();
            this.document.body.style.colorScheme =
                preference === 'system' ? 'light dark' : preference;
            try {
                localStorage.setItem(STORAGE_KEY, preference);
            } catch {
                /* private mode: the choice lasts for this session only */
            }
        });
    }

    set(preference: ThemePreference): void {
        this.preference.set(preference);
    }

    private matchDark(): MediaQueryList | undefined {
        return typeof window === 'undefined' || !window.matchMedia
            ? undefined
            : window.matchMedia('(prefers-color-scheme: dark)');
    }

    private restore(): ThemePreference {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return PREFERENCES.includes(stored as ThemePreference)
                ? (stored as ThemePreference)
                : 'system';
        } catch {
            return 'system';
        }
    }
}
