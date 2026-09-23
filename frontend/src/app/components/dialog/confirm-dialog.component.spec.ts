import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
    let close: ReturnType<typeof vi.fn>;

    function create(data: ConfirmDialogData): HTMLButtonElement[] {
        close = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close } },
            ],
        });
        const fixture = TestBed.createComponent(ConfirmDialogComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('h2')!.textContent).toContain(data.title);
        expect(el.textContent).toContain(data.message);
        return Array.from(el.querySelectorAll('button'));
    }

    it('closes with true only on confirm', () => {
        const [cancel, confirm] = create({
            title: 'dialog.title',
            message: 'dialog.message',
            confirm: 'dialog.yes',
            cancel: 'dialog.no',
        });

        expect(cancel.textContent).toContain('dialog.no');
        confirm.click();
        cancel.click();

        expect(close).toHaveBeenCalledTimes(2);
        expect(close.mock.calls[0][0]).toBe(true);
        expect(close.mock.calls[1][0]).not.toBe(true);
    });

    it('shows a single button for a notice', () => {
        const buttons = create({
            title: 'dialog.title',
            message: 'dialog.message',
            confirm: 'dialog.ok',
        });

        expect(buttons).toHaveLength(1);
        expect(buttons[0].textContent).toContain('dialog.ok');
    });
});
