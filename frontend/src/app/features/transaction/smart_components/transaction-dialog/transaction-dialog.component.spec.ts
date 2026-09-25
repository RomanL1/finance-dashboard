import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { DialogService } from '../../../../components/dialog/dialog.service';
import { AccountService } from '../../../account/services/account.service';
import { TransactionService } from '../../services/transaction.service';
import type {
    CreateTransactionDto,
    TransactionDialogData,
    TransactionDto,
} from '../../transaction.types';
import { TransactionDialogComponent } from './transaction-dialog.component';

const dto: CreateTransactionDto = {
    type: 'expense',
    amount: 1250,
    accountId: 'a1',
    categoryId: null,
    title: null,
    description: null,
    date: '2026-09-15T08:30:00.000Z',
};

describe('TransactionDialogComponent', () => {
    let transactions: {
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        lastUsed: ReturnType<typeof vi.fn>;
    };
    let list: ReturnType<typeof vi.fn>;
    let close: ReturnType<typeof vi.fn>;
    let confirm: ReturnType<typeof vi.fn>;

    function create(data: TransactionDialogData) {
        transactions = {
            create: vi.fn().mockResolvedValue({ id: 'new' }),
            update: vi.fn().mockResolvedValue({ id: 't1' }),
            delete: vi.fn().mockResolvedValue(undefined),
            lastUsed: vi.fn().mockReturnValue({ accountId: 'a1' }),
        };
        list = vi.fn().mockResolvedValue([]);
        close = vi.fn();
        confirm = vi.fn().mockResolvedValue(true);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: { close } },
                { provide: TransactionService, useValue: transactions },
                { provide: AccountService, useValue: { list } },
                { provide: DialogService, useValue: { confirm } },
            ],
        });
        const fixture = TestBed.createComponent(TransactionDialogComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('loads the accounts fresh and prefills the last-used ones for a new entry', async () => {
        const fixture = create({ householdId: 'h1', categories: [] });
        const submit = (): HTMLButtonElement =>
            fixture.nativeElement.querySelector('button[type="submit"]');
        expect(submit().disabled).toBe(true);

        await fixture.whenStable();
        fixture.detectChanges();

        expect(list).toHaveBeenCalledWith('h1');
        expect(fixture.componentInstance.defaults).toEqual({ accountId: 'a1' });
        expect(submit().disabled).toBe(false);
    });

    it('creates a new entry and closes with it', async () => {
        const dialog = create({
            householdId: 'h1',
            categories: [],
        }).componentInstance;

        await dialog.save(dto);

        expect(transactions.create).toHaveBeenCalledWith('h1', dto);
        expect(close).toHaveBeenCalledWith(true);
    });

    it('edits an existing entry, prefilled from it', async () => {
        const transaction = { id: 't1', amount: 500 } as TransactionDto;
        const dialog = create({
            householdId: 'h1',
            categories: [],
            transaction,
        }).componentInstance;

        await dialog.save(dto);

        expect(dialog.defaults).toBe(transaction);
        expect(transactions.update).toHaveBeenCalledWith('h1', 't1', dto);
        expect(transactions.create).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalledWith(true);
    });

    it('stays open with an error when saving fails', async () => {
        const dialog = create({
            householdId: 'h1',
            categories: [],
        }).componentInstance;
        transactions.create.mockRejectedValue(new Error('boom'));

        await dialog.save(dto);

        expect(close).not.toHaveBeenCalled();
        expect(dialog.error()).toBe('transaction.dialog.failed');
        expect(dialog.busy()).toBe(false);
    });

    it('renders the amount field before the accounts arrive', () => {
        const el = create({ householdId: 'h1', categories: [] })
            .nativeElement as HTMLElement;

        expect(el.querySelector('input[cdkFocusInitial]')).not.toBeNull();
    });

    it('offers delete only when editing', () => {
        const deleteButton = (data: TransactionDialogData) =>
            Array.from(
                (create(data).nativeElement as HTMLElement).querySelectorAll(
                    'button',
                ),
            ).find((b) => b.textContent!.includes('transaction.dialog.delete'));

        expect(deleteButton({ householdId: 'h1', categories: [] })).toBe(
            undefined,
        );
        TestBed.resetTestingModule();
        expect(
            deleteButton({
                householdId: 'h1',
                categories: [],
                transaction: { id: 't1' } as TransactionDto,
            }),
        ).toBeDefined();
    });

    it('deletes after confirmation and closes', async () => {
        const dialog = create({
            householdId: 'h1',
            categories: [],
            transaction: { id: 't1' } as TransactionDto,
        }).componentInstance;

        await dialog.remove();

        expect(confirm).toHaveBeenCalled();
        expect(transactions.delete).toHaveBeenCalledWith('h1', 't1');
        expect(close).toHaveBeenCalledWith(true);
    });

    it('keeps the entry when the confirmation is declined', async () => {
        const dialog = create({
            householdId: 'h1',
            categories: [],
            transaction: { id: 't1' } as TransactionDto,
        }).componentInstance;
        confirm.mockResolvedValue(false);

        await dialog.remove();

        expect(transactions.delete).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
    });

    it('stays open with an error when deleting fails', async () => {
        const dialog = create({
            householdId: 'h1',
            categories: [],
            transaction: { id: 't1' } as TransactionDto,
        }).componentInstance;
        transactions.delete.mockRejectedValue(new Error('boom'));

        await dialog.remove();

        expect(close).not.toHaveBeenCalled();
        expect(dialog.error()).toBe('transaction.dialog.deleteFailed');
        expect(dialog.busy()).toBe(false);
    });
});
