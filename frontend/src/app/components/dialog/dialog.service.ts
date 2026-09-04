import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from './confirm-dialog.component';

/** Thin MatDialog wrapper. Sizing lives in styles.css (`.app-dialog`) so it follows viewport changes. */
@Injectable({ providedIn: 'root' })
export class DialogService {
    constructor(private readonly dialog: MatDialog) {}

    /**
     * iOS only shows the keyboard for a focus() that runs synchronously inside the tap.
     * MatDialog focuses after render, so we grab a throwaway input now; when the dialog
     * moves focus to its `cdkFocusInitial` field the keyboard stays open.
     */
    private readonly keyboardOpener = (() => {
        const el = document.createElement('input');
        el.setAttribute('aria-hidden', 'true');
        el.tabIndex = -1;
        el.style.cssText =
            'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
        document.body.append(el);
        return el;
    })();

    /** Form dialogs: call synchronously from the click handler so the mobile keyboard opens. */
    open<T, D, R>(component: ComponentType<T>, data: D): MatDialogRef<T, R> {
        this.keyboardOpener.focus({ preventScroll: true });
        return this.dialog.open<T, D, R>(component, {
            data,
            panelClass: 'app-dialog',
            /* No inline `width`: CDK aligns 100%-wide panes flush-left instead of centering. */
            maxWidth: '100vw',
            /* `true`: focuses `cdkFocusInitial` if the content marks one, else the first tabbable. */
            autoFocus: true,
        });
    }

    /** Small yes/no prompt with Material's default sizing, not the full-screen `.app-dialog`. */
    async confirm(data: ConfirmDialogData): Promise<boolean> {
        const ref = this.dialog.open<
            ConfirmDialogComponent,
            ConfirmDialogData,
            boolean
        >(ConfirmDialogComponent, { data, autoFocus: 'first-tabbable' });
        return (await firstValueFrom(ref.afterClosed())) === true;
    }
}
