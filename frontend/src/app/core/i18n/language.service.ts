import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type Language = 'en' | 'de';

/** Labels are native names on purpose: a user stuck in the wrong language still finds their own. */
export const LANGUAGES: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
];

const STORAGE_KEY = 'language';

/** Read before bootstrap: `LOCALE_ID` and the translate `lang` are fixed once the app starts. */
export function restoreLanguage(): Language {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return LANGUAGES.some((l) => l.value === stored)
            ? (stored as Language)
            : 'en';
    } catch {
        return 'en';
    }
}

/** Persisted per browser. Switching reloads, because `LOCALE_ID` cannot change in a running app. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
    private readonly document = inject(DOCUMENT);
    readonly current = restoreLanguage();

    set(language: Language): void {
        if (language === this.current) return;
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch {
            /* private mode: nothing to persist, so a reload would change nothing */
            return;
        }
        this.document.location.reload();
    }
}
