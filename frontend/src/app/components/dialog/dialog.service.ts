import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

/** Thin MatDialog wrapper. Sizing lives in styles.css (`.app-dialog`) so it follows viewport changes. */
@Injectable({ providedIn: 'root' })
export class DialogService {
    constructor(private readonly dialog: MatDialog) {}

    open<T, D, R>(component: ComponentType<T>, data: D): MatDialogRef<T, R> {
        return this.dialog.open<T, D, R>(component, {
            data,
            panelClass: 'app-dialog',
            /* No inline `width`: CDK aligns 100%-wide panes flush-left instead of centering. */
            maxWidth: '100vw',
            autoFocus: 'first-tabbable',
        });
    }
}
