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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import { CategoryFormComponent } from '../../dumb_components/category-form/category-form.component';
import { CategoryService } from '../../services/category.service';
import type {
    CategoryDialogData,
    CategoryDto,
    CreateCategoryDto,
} from '../../category.types';

@Component({
    selector: 'app-category-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        CategoryFormComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>
            {{
                (data.category
                    ? 'category.dialog.editTitle'
                    : 'category.dialog.title'
                ) | translate
            }}
        </h2>
        <mat-dialog-content>
            <app-category-form
                [formId]="formId"
                [defaults]="data.category ?? null"
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="save($event)"
            />
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            <app-button variant="text" mat-dialog-close>
                {{ 'category.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy()"
            >
                {{ 'category.dialog.save' | translate }}
            </app-button>
        </mat-dialog-actions>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDialogComponent {
    readonly formId = 'category-form';
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: CategoryDialogData,
        private readonly dialogRef: MatDialogRef<
            CategoryDialogComponent,
            CategoryDto
        >,
        private readonly categories: CategoryService,
        private readonly translate: TranslateService,
    ) {}

    async save(dto: CreateCategoryDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            const saved = this.data.category
                ? await this.categories.rename(
                      this.data.householdId,
                      this.data.category.id,
                      dto,
                  )
                : await this.categories.create(this.data.householdId, dto);
            this.dialogRef.close(saved);
        } catch (err) {
            this.error.set(
                this.translate.instant(
                    isConflict(err)
                        ? 'category.dialog.duplicate'
                        : 'category.dialog.failed',
                ),
            );
        } finally {
            this.busy.set(false);
        }
    }
}

/** hey-api throws the response body on `throwOnError`; the backend puts the HTTP status on it. */
function isConflict(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'statusCode' in err &&
        (err as { statusCode: unknown }).statusCode === 409
    );
}
