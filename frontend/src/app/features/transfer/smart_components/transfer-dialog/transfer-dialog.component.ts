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
import { TransferFormComponent } from '../../dumb_components/transfer-form/transfer-form.component';
import { TransferService } from '../../services/transfer.service';
import type {
    CreateTransferDto,
    TransferDefaults,
    TransferDialogData,
} from '../../transfer.types';

@Component({
    selector: 'app-transfer-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        TransferFormComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>
            {{ title | translate }}
        </h2>
        <mat-dialog-content>
            <p class="type-body-small mb-3 text-on-surface-variant">
                {{
                    (data.settle
                        ? 'transfer.dialog.settleHint'
                        : 'transfer.dialog.hint'
                    ) | translate
                }}
            </p>
            <!-- Rendered before the accounts arrive: the dialog focuses the amount field once, right after opening. -->
            <app-transfer-form
                [formId]="formId"
                [accounts]="accounts.value() ?? []"
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
            @if (data.transfer) {
                <app-button
                    variant="text"
                    class="delete mr-auto"
                    [disabled]="busy()"
                    (clicked)="remove()"
                >
                    {{ 'transfer.dialog.delete' | translate }}
                </app-button>
            }
            <app-button variant="text" mat-dialog-close>
                {{ 'transfer.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy() || !accounts.value()"
            >
                {{ 'transfer.dialog.save' | translate }}
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
export class TransferDialogComponent {
    readonly formId = 'transfer-form';
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly defaults: TransferDefaults;
    readonly title: string;
    /** All accounts, archived included; the form hides those inactive at the chosen date. Fresh, for current archive dates. */
    readonly accounts = resource({
        loader: () => this.accountService.list(this.data.householdId),
    });

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: TransferDialogData,
        /** Closes with `true` after a save or delete, so the opener reloads. */
        private readonly dialogRef: MatDialogRef<
            TransferDialogComponent,
            boolean
        >,
        private readonly transfers: TransferService,
        private readonly accountService: AccountService,
        private readonly dialogs: DialogService,
        private readonly translate: TranslateService,
    ) {
        this.defaults = data.transfer ?? {
            fromAccountId: transfers.lastPayer(),
            ...data.defaults,
        };
        this.title = data.transfer
            ? 'transfer.dialog.editTitle'
            : data.settle
              ? 'transfer.dialog.settleTitle'
              : 'transfer.dialog.title';
    }

    async save(dto: CreateTransferDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            if (this.data.transfer) {
                await this.transfers.update(
                    this.data.householdId,
                    this.data.transfer.id,
                    dto,
                );
            } else {
                await this.transfers.create(this.data.householdId, dto);
            }
            this.dialogRef.close(true);
        } catch {
            this.error.set(this.translate.instant('transfer.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }

    /** Edit mode only. Asks first; the confirm opens on top of this dialog. */
    async remove(): Promise<void> {
        const transfer = this.data.transfer;
        if (!transfer) return;
        const confirmed = await this.dialogs.confirm({
            title: 'transfer.delete.title',
            message: 'transfer.delete.message',
            confirm: 'transfer.delete.confirm',
            cancel: 'transfer.dialog.cancel',
        });
        if (!confirmed) return;
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.transfers.delete(this.data.householdId, transfer.id);
            this.dialogRef.close(true);
        } catch {
            this.error.set(
                this.translate.instant('transfer.dialog.deleteFailed'),
            );
        } finally {
            this.busy.set(false);
        }
    }
}
