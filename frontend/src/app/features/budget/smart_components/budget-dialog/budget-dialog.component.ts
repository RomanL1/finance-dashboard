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
import { BudgetFormComponent } from '../../dumb_components/budget-form/budget-form.component';
import { BudgetService } from '../../services/budget.service';
import type { BudgetDialogData, BudgetDialogResult } from '../../budget.types';

/** Set, change or remove the limit of one category for one month. Closes with the outcome so the list can refresh. */
@Component({
    selector: 'app-budget-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        BudgetFormComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>{{ data.row.category.name }}</h2>
        <mat-dialog-content>
            <p class="type-body-medium mb-4 text-on-surface-variant">
                {{ 'budget.dialog.hint' | translate: { month: data.month } }}
            </p>
            <app-budget-form
                [formId]="formId"
                [currency]="data.currency"
                [defaultAmount]="data.row.amount"
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="save($event)"
            />
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            @if (data.row.amount !== null) {
                <app-button
                    variant="text"
                    class="mr-auto"
                    [disabled]="busy()"
                    (clicked)="remove()"
                >
                    {{ 'budget.dialog.remove' | translate }}
                </app-button>
            }
            <app-button variant="text" mat-dialog-close>
                {{ 'budget.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy()"
            >
                {{ 'budget.dialog.save' | translate }}
            </app-button>
        </mat-dialog-actions>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetDialogComponent {
    readonly formId = 'budget-form';
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: BudgetDialogData,
        private readonly dialogRef: MatDialogRef<
            BudgetDialogComponent,
            BudgetDialogResult
        >,
        private readonly budgets: BudgetService,
        private readonly translate: TranslateService,
    ) {}

    async save(amount: number): Promise<void> {
        await this.run(async () => {
            await this.budgets.set(
                this.data.householdId,
                this.data.row.category.id,
                this.data.month,
                amount,
            );
            return { amount };
        });
    }

    async remove(): Promise<void> {
        await this.run(async () => {
            await this.budgets.remove(
                this.data.householdId,
                this.data.row.category.id,
                this.data.month,
            );
            return { amount: null };
        });
    }

    private async run(op: () => Promise<BudgetDialogResult>): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            this.dialogRef.close(await op());
        } catch {
            this.error.set(this.translate.instant('budget.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }
}
