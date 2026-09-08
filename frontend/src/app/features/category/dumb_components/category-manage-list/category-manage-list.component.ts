import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatList, MatListItem } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../../../../components/button/button.component';
import type { CategoryDto } from '../../category.types';

/** Settings view: every category with its transaction count and an actions menu per row. */
@Component({
    selector: 'app-category-manage-list',
    imports: [
        TranslatePipe,
        MatIcon,
        MatList,
        MatListItem,
        MatMenu,
        MatMenuItem,
        MatMenuTrigger,
        IconButtonComponent,
    ],
    template: `
        @if (categories().length === 0) {
            <p>{{ 'category.list.empty' | translate }}</p>
        } @else {
            <mat-list>
                @for (category of categories(); track category.id) {
                    <mat-list-item class="!h-auto !py-2">
                        <span matListItemTitle>{{ category.name }}</span>
                        <span matListItemLine>
                            {{
                                'category.manage.transactionCount'
                                    | translate
                                        : { count: category.transactionCount }
                            }}
                        </span>
                        <app-icon-button
                            matListItemMeta
                            [matMenuTriggerFor]="menu"
                            [ariaLabel]="'category.manage.actions' | translate"
                        >
                            <mat-icon>more_vert</mat-icon>
                        </app-icon-button>
                        <mat-menu #menu="matMenu">
                            <button
                                mat-menu-item
                                type="button"
                                (click)="edit.emit(category.id)"
                            >
                                <mat-icon>edit</mat-icon>
                                {{ 'category.manage.edit' | translate }}
                            </button>
                            <button
                                mat-menu-item
                                type="button"
                                (click)="remove.emit(category.id)"
                            >
                                <mat-icon>delete</mat-icon>
                                {{ 'category.manage.delete' | translate }}
                            </button>
                        </mat-menu>
                    </mat-list-item>
                }
            </mat-list>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManageListComponent {
    readonly categories = input.required<CategoryDto[]>();
    readonly edit = output<string>();
    readonly remove = output<string>();
}
