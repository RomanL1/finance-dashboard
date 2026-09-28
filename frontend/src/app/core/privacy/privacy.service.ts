import { effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'hideAmounts';

/** Blurs money figures on screen, for using the app with someone looking over your shoulder. Per device. */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
    readonly hideAmounts = signal(this.restore());

    constructor() {
        effect(() => {
            const hide = this.hideAmounts();
            try {
                localStorage.setItem(STORAGE_KEY, String(hide));
            } catch {
                /* private mode: the choice lasts for this session only */
            }
        });
    }

    setHideAmounts(hide: boolean): void {
        this.hideAmounts.set(hide);
    }

    private restore(): boolean {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }
}
