import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Narrow centered column with a heading, shared by all auth pages. */
@Component({
    selector: 'app-auth-layout',
    template: `
        <main class="mx-auto mt-16 flex max-w-sm flex-col gap-4 p-4">
            <h1 class="mb-2 text-2xl font-semibold">{{ heading() }}</h1>
            <ng-content />
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
    readonly heading = input.required<string>();
}
