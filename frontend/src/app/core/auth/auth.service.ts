import { computed, Inject, Injectable, signal } from '@angular/core';
import { AUTH_CLIENT, type AuthClient, type SessionUser } from './auth-client';

/** better-auth's error `code` (e.g. `INVALID_EMAIL_OR_PASSWORD`), for pages to translate. */
export class AuthError extends Error {
    constructor(readonly code: string) {
        super(code);
        this.name = 'AuthError';
    }
}

interface ClientError {
    code?: string;
    status: number;
}

/** Rate-limit responses carry no code, only the status. */
function throwIfError(error: ClientError | null): void {
    if (!error) return;
    throw new AuthError(
        error.status === 429 ? 'TOO_MANY_REQUESTS' : (error.code ?? 'UNKNOWN'),
    );
}

/** Session state as signals. Call `refresh()` once on startup (see app.config.ts). */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _user = signal<SessionUser | null>(null);
    private readonly _ready = signal(false);

    readonly user = this._user.asReadonly();
    readonly ready = this._ready.asReadonly();
    readonly isAuthenticated = computed(() => this._user() !== null);

    constructor(@Inject(AUTH_CLIENT) private readonly client: AuthClient) {}

    async refresh(): Promise<void> {
        const { data } = await this.client.getSession();
        this._user.set(data?.user ?? null);
        this._ready.set(true);
    }

    async signIn(email: string, password: string): Promise<void> {
        const { error } = await this.client.signIn.email({ email, password });
        throwIfError(error);
        await this.refresh();
    }

    /** Creates the user only; the session starts once the mailed link is opened (`verifyEmail`). */
    async signUp(name: string, email: string, password: string): Promise<void> {
        const { error } = await this.client.signUp.email({
            name,
            email,
            password,
        });
        throwIfError(error);
    }

    async resendVerification(email: string): Promise<void> {
        const { error } = await this.client.sendVerificationEmail({ email });
        throwIfError(error);
    }

    /** Verifying signs the user in (autoSignInAfterVerification on the backend). */
    async verifyEmail(token: string): Promise<void> {
        const { error } = await this.client.verifyEmail({ query: { token } });
        throwIfError(error);
        await this.refresh();
    }

    /** Succeeds for unknown emails too, so the page cannot reveal which accounts exist. */
    async requestPasswordReset(email: string): Promise<void> {
        const { error } = await this.client.requestPasswordReset({ email });
        throwIfError(error);
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const { error } = await this.client.resetPassword({
            token,
            newPassword,
        });
        throwIfError(error);
    }

    async signOut(): Promise<void> {
        await this.client.signOut();
        this._user.set(null);
    }
}
