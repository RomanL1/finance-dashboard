import { Component, inject, resource } from '@angular/core';
import { Router } from '@angular/router';
import { householdMine } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-home-page',
    template: `
        <main class="mx-auto mt-16 max-w-lg p-4">
            <header class="mb-6 flex items-center justify-between">
                <h1 class="text-2xl font-semibold">
                    Hallo {{ auth.user()?.name }}
                </h1>
                <button
                    type="button"
                    (click)="signOut()"
                    class="rounded border px-3 py-1"
                >
                    Abmelden
                </button>
            </header>
            @if (household.isLoading()) {
                <p>Lade Haushalt…</p>
            } @else if (household.error()) {
                <p role="alert" class="text-red-700">Kein Haushalt gefunden.</p>
            } @else if (household.value(); as h) {
                <dl class="grid grid-cols-2 gap-2">
                    <dt>Haushalt</dt>
                    <dd>{{ h.name }}</dd>
                    <dt>Währung</dt>
                    <dd>{{ h.currency }}</dd>
                    <dt>Rolle</dt>
                    <dd>{{ h.role }}</dd>
                </dl>
            }
        </main>
    `,
})
export class HomePage {
    protected readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    /** Generated hey-api SDK call; `throwOnError` makes the resource surface HTTP errors. */
    readonly household = resource({
        loader: async () => (await householdMine({ throwOnError: true })).data,
    });

    async signOut(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/login']);
    }
}
