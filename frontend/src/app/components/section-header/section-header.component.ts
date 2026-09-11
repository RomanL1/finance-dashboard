import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Section title with an optional trailing action slot, so overview and settings sections line up. */
@Component({
    selector: 'app-section-header',
    template: `
        <div class="mb-3 flex min-h-10 items-center justify-between gap-2">
            <h2 class="type-title-medium text-on-surface">{{ title() }}</h2>
            <ng-content />
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeaderComponent {
    readonly title = input.required<string>();
}
