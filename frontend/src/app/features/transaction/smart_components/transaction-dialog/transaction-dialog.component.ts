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
import { TransactionFormComponent } from '../../dumb_components/transaction-form/transaction-form.component';
import { TransactionService } from '../../services/transaction.service';
import type {
    CreateTransactionDto,
    TransactionDialogData,
    TransactionDto,
} from '../../transaction.types';

@Component({
    selector: 'app-transaction-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        TransactionFormComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>{{ 'transaction.dialog.title' | translate }}</h2>
        <mat-dialog-content>
            <app-transaction-form
                [formId]="formId"
                [accounts]="data.accounts"
                [categories]="data.categories"
                (submitted)="save($event)"
            />
            @if (error()) {
                <p role="alert" class="mt-2 text-red-700">{{ error() }}</p>
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <app-button variant="text" mat-dialog-close>
                {{ 'transaction.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy()"
            >
                {{ 'transaction.dialog.save' | translate }}
            </app-button>
        </mat-dialog-actions>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDialogComponent {
    readonly formId = 'transaction-form';
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: TransactionDialogData,
        private readonly dialogRef: MatDialogRef<
            TransactionDialogComponent,
            TransactionDto
        >,
        private readonly transactions: TransactionService,
        private readonly translate: TranslateService,
    ) {}

    async save(dto: CreateTransactionDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            const created = await this.transactions.create(
                this.data.householdId,
                dto,
            );
            this.dialogRef.close(created);
        } catch {
            this.error.set(this.translate.instant('transaction.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }
}
