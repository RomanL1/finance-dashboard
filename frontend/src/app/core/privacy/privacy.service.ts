import { effect, Injectable, signal, type WritableSignal } from '@angular/core';

/** What a money figure is, for hiding: an account balance, or anything built from transactions. */
export type FigureKind = 'balance' | 'transaction';

/** Blurs money figures on screen, for using the app with someone looking over your shoulder. Per device. */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
    readonly hideBalances = this.persisted('hideBalances');
    readonly hideTransactions = this.persisted('hideTransactions');

    isHidden(kind: FigureKind): boolean {
        return kind === 'balance'
            ? this.hideBalances()
            : this.hideTransactions();
    }

    setHideBalances(hide: boolean): void {
        this.hideBalances.set(hide);
    }

    setHideTransactions(hide: boolean): void {
        this.hideTransactions.set(hide);
    }

    private persisted(key: string): WritableSignal<boolean> {
        const value = signal(this.restore(key));
        effect(() => {
            const hide = value();
            try {
                localStorage.setItem(key, String(hide));
            } catch {
                /* private mode: the choice lasts for this session only */
            }
        });
        return value;
    }

    private restore(key: string): boolean {
        try {
            return localStorage.getItem(key) === 'true';
        } catch {
            return false;
        }
    }
}
