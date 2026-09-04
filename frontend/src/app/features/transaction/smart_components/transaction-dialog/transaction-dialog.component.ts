import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    resource,
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
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AccountService } from '../../../account/services/account.service';
import { ButtonComponent } from '../../../../components/button/button.component';
import { TransactionFormComponent } from '../../dumb_components/transaction-form/transaction-form.component';
import { TransactionService } from '../../services/transaction.service';
import type {
    CreateTransactionDto,
    TransactionDefaults,
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
        MatProgressSpinner,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>
            {{
                (data.transaction
                    ? 'transaction.dialog.editTitle'
                    : 'transaction.dialog.title'
                ) | translate
            }}
        </h2>
        <mat-dialog-content>
            @if (accounts.value(); as accts) {
                <app-transaction-form
                    [formId]="formId"
                    [accounts]="accts"
                    [categories]="data.categories"
                    [defaults]="defaults"
                    (submitted)="save($event)"
                />
            } @else {
                <mat-spinner class="mx-auto" diameter="40" />
            }
            @if (error()) {
                <p role="alert" class="mt-2 text-red-700">{{ error() }}</p>
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            <app-button variant="text" mat-dialog-close>
                {{ 'transaction.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy() || !accounts.value()"
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
    readonly defaults: TransactionDefaults;
    /** All accounts, archived included; the form hides those inactive at the chosen date. */
    readonly accounts = resource({
        loader: () => this.accountService.list(this.data.householdId),
    });

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: TransactionDialogData,
        private readonly dialogRef: MatDialogRef<
            TransactionDialogComponent,
            TransactionDto
        >,
        private readonly transactions: TransactionService,
        private readonly accountService: AccountService,
        private readonly translate: TranslateService,
    ) {
        this.defaults = data.transaction ?? transactions.lastUsed();
    }

    async save(dto: CreateTransactionDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            const saved = this.data.transaction
                ? await this.transactions.update(
                      this.data.householdId,
                      this.data.transaction.id,
                      dto,
                  )
                : await this.transactions.create(this.data.householdId, dto);
            this.dialogRef.close(saved);
        } catch {
            this.error.set(this.translate.instant('transaction.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }
}
