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
import { AccountFormComponent } from '../../dumb_components/account-form/account-form.component';
import { AccountService } from '../../services/account.service';
import type {
    AccountDialogData,
    AccountDto,
    CreateAccountDto,
} from '../../account.types';

@Component({
    selector: 'app-account-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        AccountFormComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>
            {{
                (data.account
                    ? 'account.dialog.editTitle'
                    : 'account.dialog.title'
                ) | translate
            }}
        </h2>
        <mat-dialog-content>
            <app-account-form
                [formId]="formId"
                [defaults]="data.account ?? null"
                [busy]="busy()"
                [errorMessage]="error()"
                (submitted)="save($event)"
            />
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            <app-button variant="text" mat-dialog-close>
                {{ 'account.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy()"
            >
                {{ 'account.dialog.save' | translate }}
            </app-button>
        </mat-dialog-actions>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDialogComponent {
    readonly formId = 'account-form';
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: AccountDialogData,
        private readonly dialogRef: MatDialogRef<
            AccountDialogComponent,
            AccountDto
        >,
        private readonly accounts: AccountService,
        private readonly translate: TranslateService,
    ) {}

    /** Editing keeps the archive state and the initial value; the list handles archive/unarchive. */
    async save(dto: CreateAccountDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            const saved = this.data.account
                ? await this.accounts.update(
                      this.data.householdId,
                      this.data.account.id,
                      {
                          description: dto.description,
                          currency: dto.currency,
                          startDate: dto.startDate,
                          archivedAt: this.data.account.archivedAt,
                      },
                  )
                : await this.accounts.create(this.data.householdId, dto);
            this.dialogRef.close(saved);
        } catch {
            this.error.set(this.translate.instant('account.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }
}
