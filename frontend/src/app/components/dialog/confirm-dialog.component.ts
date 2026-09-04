import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
} from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../button/button.component';

/** Translation keys; the opener decides the wording. */
export interface ConfirmDialogData {
    title: string;
    message: string;
    confirm: string;
    cancel: string;
}

/** Closes with `true` on confirm, `undefined` otherwise. Open via `DialogService.confirm`. */
@Component({
    selector: 'app-confirm-dialog',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        ButtonComponent,
        TranslatePipe,
    ],
    template: `
        <h2 mat-dialog-title>{{ data.title | translate }}</h2>
        <mat-dialog-content>{{ data.message | translate }}</mat-dialog-content>
        <mat-dialog-actions align="end" class="gap-2">
            <app-button variant="text" mat-dialog-close>
                {{ data.cancel | translate }}
            </app-button>
            <app-button variant="filled" [mat-dialog-close]="true">
                {{ data.confirm | translate }}
            </app-button>
        </mat-dialog-actions>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData) {}
}
