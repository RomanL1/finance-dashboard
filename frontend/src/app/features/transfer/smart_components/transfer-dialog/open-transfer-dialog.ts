import type { MatDialogRef } from '@angular/material/dialog';
import type { DialogService } from '../../../../components/dialog/dialog.service';
import type { TransferDialogData } from '../../transfer.types';
import type { TransferDialogComponent } from './transfer-dialog.component';

/**
 * Opens the transfer dialog, loading it lazily so its form stack stays out of the opener's chunk.
 * Call synchronously from the click handler (mobile keyboard). Closes with `true` after a change.
 */
export function openTransferDialog(
    dialogs: DialogService,
    data: TransferDialogData,
): Promise<MatDialogRef<TransferDialogComponent, boolean>> {
    return dialogs.open<TransferDialogComponent, TransferDialogData, boolean>(
        () =>
            import('./transfer-dialog.component').then(
                (m) => m.TransferDialogComponent,
            ),
        data,
        /* Editing: no keyboard popping up over the prefilled form. */
        { focusInput: !data.transfer },
    );
}
