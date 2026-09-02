import { computed, Injectable, signal } from '@angular/core';
import { authClient, type SessionUser } from './auth-client';

/** Session state as signals. Call `refresh()` once on startup (see app.config.ts). */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _user = signal<SessionUser | null>(null);
    private readonly _ready = signal(false);

    readonly user = this._user.asReadonly();
    readonly ready = this._ready.asReadonly();
    readonly isAuthenticated = computed(() => this._user() !== null);

    async refresh(): Promise<void> {
        const { data } = await authClient.getSession();
        this._user.set(data?.user ?? null);
        this._ready.set(true);
    }

    async signIn(email: string, password: string): Promise<void> {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
            throw new Error(error.message ?? 'Sign-in failed');
        }
        await this.refresh();
    }

    async signOut(): Promise<void> {
        await authClient.signOut();
        this._user.set(null);
    }
}
