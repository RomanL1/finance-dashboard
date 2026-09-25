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
        /* Each service appends its own hidden input; start every test unfocused. */
        (document.activeElement as HTMLElement | null)?.blur();
        TestBed.configureTestingModule({
            providers: [{ provide: MatDialog, useValue: { open } }],
        });
        return TestBed.inject(DialogService);
    }

    it('loads form dialogs lazily and opens them full-width with their data', async () => {
        const service = setup();

        await service.open(() => Promise.resolve(FormDialogComponent), {
            id: 1,
        });

        expect(open).toHaveBeenCalledWith(FormDialogComponent, {
            data: { id: 1 },
            panelClass: 'app-dialog',
            maxWidth: '100vw',
            autoFocus: true,
            restoreFocus: document.body,
        });
    });

    it('restores focus to the trigger, never to the hidden input', async () => {
        const service = setup();
        const trigger = document.createElement('button');
        document.body.append(trigger);
        trigger.focus();

        await service.open(() => Promise.resolve(FormDialogComponent), {});
        await service.open(() => Promise.resolve(FormDialogComponent), {});

        expect(open.mock.calls[0][1].restoreFocus).toBe(trigger);
        /* Second open starts with the hidden input focused (no dialog here to move it). */
        expect(open.mock.calls[1][1].restoreFocus).toBe(false);
        trigger.remove();
    });

    it('skips the keyboard and focuses the dialog when editing', async () => {
        const service = setup();

        await service.open(
            () => Promise.resolve(FormDialogComponent),
            {},
            { focusInput: false },
        );

        expect(document.activeElement).toBe(document.body);
        expect(open.mock.calls[0][1].autoFocus).toBe('dialog');
    });

    it('focuses a hidden input synchronously so iOS opens the keyboard', () => {
        const service = setup();

        /* Not awaited: the focus must happen before the dialog chunk loads. */
        void service.open(
            () => new Promise<typeof FormDialogComponent>(() => undefined),
            {},
        );

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
