import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    signal,
} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import type {
    CategoryDeleteChoice,
    CategoryDeleteDialogData,
} from '../../category.types';

/**
 * Asks what happens to a category's transactions before it is deleted: uncategorize them,
 * or move them to another category. Only opened when the category has transactions.
 * Closes with a `CategoryDeleteChoice`, or `undefined` on cancel. No service access:
 * the opener performs the delete.
 */
@Component({
    selector: 'app-category-delete-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        MatFormField,
        MatLabel,
        MatSelect,
        MatOption,
        ButtonComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>
            {{
                'category.delete.title'
                    | translate: { name: data.category.name }
            }}
        </h2>
        <mat-dialog-content class="flex flex-col gap-4">
            <p>
                {{
                    'category.delete.message'
                        | translate: { count: data.category.transactionCount }
                }}
            </p>
            @if (data.others.length > 0) {
                <mat-form-field class="flex flex-col gap-1">
                    <mat-label>{{
                        'category.delete.transferLabel' | translate
                    }}</mat-label>
                    <mat-select
                        [value]="transferTo()"
                        (valueChange)="transferTo.set($event)"
                    >
                        @for (other of data.others; track other.id) {
                            <mat-option [value]="other.id">{{
                                other.name
                            }}</mat-option>
                        }
                    </mat-select>
                </mat-form-field>
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="flex-wrap gap-2">
            <app-button variant="text" mat-dialog-close>
                {{ 'category.dialog.cancel' | translate }}
            </app-button>
            <!-- Picking a target commits to the transfer path; unset the select to go back. -->
            <app-button
                variant="outlined"
                [disabled]="!!transferTo()"
                (clicked)="uncategorize()"
            >
                {{ 'category.delete.uncategorize' | translate }}
            </app-button>
            @if (data.others.length > 0) {
                <app-button
                    variant="filled"
                    [disabled]="!transferTo()"
                    (clicked)="transfer()"
                >
                    {{ 'category.delete.transfer' | translate }}
                </app-button>
            }
        </mat-dialog-actions>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDeleteDialogComponent {
    readonly transferTo = signal<string | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: CategoryDeleteDialogData,
        private readonly dialogRef: MatDialogRef<
            CategoryDeleteDialogComponent,
            CategoryDeleteChoice
        >,
    ) {}

    uncategorize(): void {
        this.dialogRef.close({ transferTo: null });
    }

    transfer(): void {
        const target = this.transferTo();
        if (!target) return;
        this.dialogRef.close({ transferTo: target });
    }
}
