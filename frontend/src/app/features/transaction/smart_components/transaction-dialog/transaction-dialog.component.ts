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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AccountService } from '../../../account/services/account.service';
import { ButtonComponent } from '../../../../components/button/button.component';
import { DialogService } from '../../../../components/dialog/dialog.service';
import { TransactionFormComponent } from '../../dumb_components/transaction-form/transaction-form.component';
import { TransactionService } from '../../services/transaction.service';
import type {
    CreateTransactionDto,
    TransactionDefaults,
    TransactionDialogData,
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
        <h2 mat-dialog-title>
            {{
                (data.transaction
                    ? 'transaction.dialog.editTitle'
                    : 'transaction.dialog.title'
                ) | translate
            }}
        </h2>
        <mat-dialog-content>
            <!-- Rendered before the accounts arrive: the dialog focuses the amount field once,
                 right after opening, and the field must exist by then. -->
            <app-transaction-form
                [formId]="formId"
                [accounts]="accounts.value() ?? []"
                [categories]="data.categories"
                [defaults]="defaults"
                (submitted)="save($event)"
            />
            @if (error()) {
                <p role="alert" class="mt-2 type-body-medium text-error">
                    {{ error() }}
                </p>
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            @if (data.transaction) {
                <app-button
                    variant="text"
                    class="delete mr-auto"
                    [disabled]="busy()"
                    (clicked)="remove()"
                >
                    {{ 'transaction.dialog.delete' | translate }}
                </app-button>
            }
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
    styles: `
        .delete {
            --mat-button-text-label-text-color: var(--mat-sys-error);
        }
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
        /** Closes with `true` after a save or delete, so the opener reloads. */
        private readonly dialogRef: MatDialogRef<
            TransactionDialogComponent,
            boolean
        >,
        private readonly transactions: TransactionService,
        private readonly accountService: AccountService,
        private readonly dialogs: DialogService,
        private readonly translate: TranslateService,
    ) {
        this.defaults = data.transaction ?? transactions.lastUsed();
    }

    async save(dto: CreateTransactionDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            if (this.data.transaction) {
                await this.transactions.update(
                    this.data.householdId,
                    this.data.transaction.id,
                    dto,
                );
            } else {
                await this.transactions.create(this.data.householdId, dto);
            }
            this.dialogRef.close(true);
        } catch {
            this.error.set(this.translate.instant('transaction.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }

    /** Edit mode only. Asks first; the confirm opens on top of this dialog. */
    async remove(): Promise<void> {
        const transaction = this.data.transaction;
        if (!transaction) return;
        const confirmed = await this.dialogs.confirm({
            title: 'transaction.delete.title',
            message: 'transaction.delete.message',
            confirm: 'transaction.delete.confirm',
            cancel: 'transaction.dialog.cancel',
        });
        if (!confirmed) return;
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.transactions.delete(
                this.data.householdId,
                transaction.id,
            );
            this.dialogRef.close(true);
        } catch {
            this.error.set(
                this.translate.instant('transaction.dialog.deleteFailed'),
            );
        } finally {
            this.busy.set(false);
        }
    }
}
