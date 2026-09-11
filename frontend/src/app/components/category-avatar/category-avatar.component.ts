import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    LOCALE_ID,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { categoryColor } from './category-color';

/**
 * 40px circle with the category's initial on a hue derived from its id.
 * Uncategorized (null id) shows a neutral label icon instead.
 */
@Component({
    selector: 'app-category-avatar',
    imports: [MatIcon],
    template: `
        @if (categoryId(); as id) {
            <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full type-title-medium text-on-account"
                [style.background]="color()"
                aria-hidden="true"
            >
                {{ initial() }}
            </span>
        } @else {
            <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface-variant"
                aria-hidden="true"
            >
                <mat-icon>label</mat-icon>
            </span>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryAvatarComponent {
    readonly categoryId = input.required<string | null>();
    readonly name = input.required<string | null>();

    private readonly locale = inject(LOCALE_ID);

    protected readonly color = computed(() => {
        const id = this.categoryId();
        return id ? categoryColor(id) : '';
    });

    protected readonly initial = computed(() => {
        const first = [...(this.name() ?? '').trim()][0];
        return first ? first.toLocaleUpperCase(this.locale) : '?';
    });
}
