import { Injectable, signal } from '@angular/core';
import type { CategorySelection, Currency } from '../onboarding.types';

const STORAGE_KEY = 'onboarding-draft';

export interface OnboardingDraft {
    name: string | null;
    currency: Currency | null;
    categories: CategorySelection | null;
}

const EMPTY_DRAFT: OnboardingDraft = {
    name: null,
    currency: null,
    categories: null,
};

/**
 * Caches wizard answers in localStorage so nothing is sent to the backend until the
 * final step, when the whole household is submitted in one request.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
    private readonly _draft = signal<OnboardingDraft>(this.load());
    readonly draft = this._draft.asReadonly();

    setHousehold(name: string): void {
        this.update({ name });
    }

    setCurrency(currency: Currency): void {
        this.update({ currency });
    }

    setCategories(categories: CategorySelection): void {
        this.update({ categories });
    }

    clear(): void {
        this._draft.set(EMPTY_DRAFT);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* localStorage unavailable (private mode) — nothing to clean up */
        }
    }

    private update(patch: Partial<OnboardingDraft>): void {
        this._draft.update((draft) => ({ ...draft, ...patch }));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._draft()));
        } catch {
            /* localStorage unavailable (private mode) — draft won't survive a reload */
        }
    }

    private load(): OnboardingDraft {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT;
        } catch {
            return EMPTY_DRAFT;
        }
    }
}
