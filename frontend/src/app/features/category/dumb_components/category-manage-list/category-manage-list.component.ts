import { DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
} from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import { CategoryAvatarComponent } from '../../../../components/category-avatar/category-avatar.component';
import type { CategoryDto } from '../../category.types';

/** Settings view: every category with its transaction count and an actions menu per row. Same row grid as the transaction list. */
@Component({
    selector: 'app-category-manage-list',
    imports: [
        DecimalPipe,
        TranslatePipe,
        MatIcon,
        MatMenu,
        MatMenuContent,
        MatMenuItem,
        MatMenuTrigger,
        IconButtonComponent,
        CategoryAvatarComponent,
    ],
    template: `
        @if (categories().length === 0) {
            <p class="type-body-medium text-on-surface-variant">
                {{ 'category.list.empty' | translate }}
            </p>
        } @else {
            <ul>
                @for (
                    category of sorted();
                    track category.id;
                    let last = $last
                ) {
                    <li
                        class="relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 py-2.5"
                    >
                        <app-category-avatar
                            [categoryId]="category.id"
                            [name]="category.name"
                        />
                        <p class="type-body-large truncate text-on-surface">
                            {{ category.name }}
                        </p>
                        <p class="flex flex-col items-end">
                            <span
                                class="type-title-medium text-on-surface tabular-nums"
                                >{{ category.transactionCount | number }}</span
                            >
                            <span
                                class="type-label-small text-on-surface-variant"
                            >
                                {{ 'category.manage.transactions' | translate }}
                            </span>
                        </p>
                        <app-icon-button
                            [matMenuTriggerFor]="menu"
                            [matMenuTriggerData]="{ id: category.id }"
                            [ariaLabel]="'category.manage.actions' | translate"
                        >
                            <mat-icon svgIcon="more_vert" />
                        </app-icon-button>
                        @if (!last) {
                            <span
                                aria-hidden="true"
                                class="absolute right-0 bottom-0 left-[3.25rem] border-b border-outline-variant"
                            ></span>
                        }
                    </li>
                }
            </ul>
            <mat-menu #menu="matMenu">
                <ng-template matMenuContent let-id="id">
                    <button mat-menu-item type="button" (click)="edit.emit(id)">
                        <mat-icon svgIcon="edit" />
                        {{ 'category.manage.edit' | translate }}
                    </button>
                    <button
                        mat-menu-item
                        type="button"
                        (click)="remove.emit(id)"
                    >
                        <mat-icon svgIcon="delete" />
                        {{ 'category.manage.delete' | translate }}
                    </button>
                </ng-template>
            </mat-menu>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManageListComponent {
    readonly categories = input.required<CategoryDto[]>();
    /** Most-used first; ties by name so the order is stable. Input is not mutated. */
    protected readonly sorted = computed(() =>
        [...this.categories()].sort(
            (a, b) =>
                b.transactionCount - a.transactionCount ||
                a.name.localeCompare(b.name),
        ),
    );
    readonly edit = output<string>();
    readonly remove = output<string>();
}
