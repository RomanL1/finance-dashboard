import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { DialogService } from './dialog.service';

@Component({ template: '' })
class FormDialogComponent {}

describe('DialogService', () => {
    let open: ReturnType<typeof vi.fn>;

    function setup(closedWith?: unknown): DialogService {
        open = vi.fn(() => ({ afterClosed: () => of(closedWith) }));
        TestBed.configureTestingModule({
            providers: [{ provide: MatDialog, useValue: { open } }],
        });
        return TestBed.inject(DialogService);
    }

    it('opens form dialogs full-width with their data', () => {
        const service = setup();

        service.open(FormDialogComponent, { id: 1 });

        expect(open).toHaveBeenCalledWith(FormDialogComponent, {
            data: { id: 1 },
            panelClass: 'app-dialog',
            maxWidth: '100vw',
            autoFocus: true,
        });
    });

    it('focuses a hidden input synchronously so iOS opens the keyboard', () => {
        const service = setup();

        service.open(FormDialogComponent, {});

        const focused = document.activeElement as HTMLInputElement;
        expect(focused.tagName).toBe('INPUT');
        expect(focused.getAttribute('aria-hidden')).toBe('true');
        expect(focused.tabIndex).toBe(-1);
    });

    it.each<[unknown, boolean]>([
        [true, true],
        [undefined, false],
        [false, false],
        ['yes', false],
    ])('confirm closed with %j resolves %s', async (closedWith, expected) => {
        const service = setup(closedWith);
        const data = { title: 't', message: 'm', confirm: 'c' };

        await expect(service.confirm(data)).resolves.toBe(expected);
        expect(open).toHaveBeenCalledWith(ConfirmDialogComponent, {
            data,
            autoFocus: 'first-tabbable',
        });
    });
});
