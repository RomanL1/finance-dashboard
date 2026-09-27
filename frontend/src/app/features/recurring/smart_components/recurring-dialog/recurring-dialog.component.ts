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
import { ButtonComponent } from '../../../../components/button/button.component';
import { DialogService } from '../../../../components/dialog/dialog.service';
import { AccountService } from '../../../account/services/account.service';
import { RecurringFormComponent } from '../../dumb_components/recurring-form/recurring-form.component';
import type {
    RecurringDialogData,
    SaveRecurringTransactionDto,
} from '../../recurring.types';
import { RecurringService } from '../../services/recurring.service';

@Component({
    selector: 'app-recurring-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        RecurringFormComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>
            {{
                (data.rule
                    ? 'recurring.dialog.editTitle'
                    : 'recurring.dialog.title'
                ) | translate
            }}
        </h2>
        <mat-dialog-content>
            @if (data.rule) {
                <p class="type-body-small mb-3 text-on-surface-variant">
                    {{ 'recurring.dialog.editHint' | translate }}
                </p>
            }
            <app-recurring-form
                [formId]="formId"
                [accounts]="accounts.value() ?? []"
                [categories]="data.categories"
                [rule]="data.rule"
                (submitted)="save($event)"
            />
            @if (error()) {
                <p role="alert" class="mt-2 type-body-medium text-error">
                    {{ error() }}
                </p>
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            @if (data.rule) {
                <app-button
                    variant="text"
                    class="delete mr-auto"
                    [disabled]="busy()"
                    (clicked)="remove()"
                >
                    {{ 'recurring.dialog.delete' | translate }}
                </app-button>
            }
            <app-button variant="text" mat-dialog-close>
                {{ 'recurring.dialog.cancel' | translate }}
            </app-button>
            <app-button
                type="submit"
                variant="filled"
                [formId]="formId"
                [disabled]="busy() || !accounts.value()"
            >
                {{ 'recurring.dialog.save' | translate }}
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
export class RecurringDialogComponent {
    readonly formId = 'recurring-form';
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly accounts = resource({
        loader: () => this.accountService.list(this.data.householdId),
    });

    constructor(
        @Inject(MAT_DIALOG_DATA) readonly data: RecurringDialogData,
        /** Closes with `true` after a save or delete, so the opener reloads. */
        private readonly dialogRef: MatDialogRef<
            RecurringDialogComponent,
            boolean
        >,
        private readonly recurring: RecurringService,
        private readonly accountService: AccountService,
        private readonly dialogs: DialogService,
        private readonly translate: TranslateService,
    ) {}

    async save(dto: SaveRecurringTransactionDto): Promise<void> {
        this.busy.set(true);
        this.error.set(null);
        try {
            if (this.data.rule) {
                await this.recurring.update(
                    this.data.householdId,
                    this.data.rule.id,
                    dto,
                );
            } else {
                await this.recurring.create(this.data.householdId, dto);
            }
            this.dialogRef.close(true);
        } catch {
            this.error.set(this.translate.instant('recurring.dialog.failed'));
        } finally {
            this.busy.set(false);
        }
    }

    /** Edit mode only. Booked transactions stay, which the confirm says. */
    async remove(): Promise<void> {
        const rule = this.data.rule;
        if (!rule) return;
        const confirmed = await this.dialogs.confirm({
            title: 'recurring.delete.title',
            message: 'recurring.delete.message',
            confirm: 'recurring.delete.confirm',
            cancel: 'recurring.dialog.cancel',
        });
        if (!confirmed) return;
        this.busy.set(true);
        this.error.set(null);
        try {
            await this.recurring.delete(this.data.householdId, rule.id);
            this.dialogRef.close(true);
        } catch {
            this.error.set(
                this.translate.instant('recurring.dialog.deleteFailed'),
            );
        } finally {
            this.busy.set(false);
        }
    }
}
