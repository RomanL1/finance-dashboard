import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import type {
    AccountDialogData,
    AccountDto,
    CreateAccountDto,
} from '../../account.types';
import { AccountService } from '../../services/account.service';
import { AccountDialogComponent } from './account-dialog.component';

const existing: AccountDto = {
    id: 'a1',
    householdId: 'h1',
    number: 1,
    description: 'Old',
    type: 'savings',
    currency: 'CHF',
    initialValue: 500,
    amount: 500,
    startDate: '2025-01-01T00:00:00.000Z',
    archivedAt: '2026-06-01T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
};

const dto: CreateAccountDto = {
    description: 'Checking',
    type: 'checking',
    currency: 'CHF',
    initialValue: 10000,
    startDate: '2026-01-01',
};

describe('AccountDialogComponent', () => {
    let accounts: {
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let close: ReturnType<typeof vi.fn>;

    function create(data: AccountDialogData): AccountDialogComponent {
        accounts = {
            create: vi.fn().mockResolvedValue({ id: 'new' }),
            update: vi.fn().mockResolvedValue({ id: 'a1' }),
        };
        close = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close } },
                { provide: AccountService, useValue: accounts },
            ],
        });
        const fixture = TestBed.createComponent(AccountDialogComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('creates an account and closes with it', async () => {
        const dialog = create({ householdId: 'h1', currency: 'CHF' });

        await dialog.save(dto);

        expect(accounts.create).toHaveBeenCalledWith('h1', dto);
        expect(close).toHaveBeenCalledWith({ id: 'new' });
        expect(dialog.busy()).toBe(false);
    });

    it('edits without the initial value and keeps the archive state', async () => {
        const dialog = create({
            householdId: 'h1',
            currency: 'CHF',
            account: existing,
        });

        await dialog.save(dto);

        expect(accounts.update).toHaveBeenCalledWith('h1', 'a1', {
            description: 'Checking',
            type: 'checking',
            currency: 'CHF',
            startDate: '2026-01-01',
            archivedAt: '2026-06-01T00:00:00.000Z',
        });
        expect(accounts.create).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalledWith({ id: 'a1' });
    });

    it('stays open with an error when saving fails', async () => {
        const dialog = create({ householdId: 'h1', currency: 'CHF' });
        accounts.create.mockRejectedValue(new Error('boom'));

        await dialog.save(dto);

        expect(close).not.toHaveBeenCalled();
        expect(dialog.error()).toBe('account.dialog.failed');
        expect(dialog.busy()).toBe(false);
    });
});
