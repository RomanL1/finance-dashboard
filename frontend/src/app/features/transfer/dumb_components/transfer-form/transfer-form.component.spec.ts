import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { AccountDto } from '../../../../core/api';
import type { CreateTransferDto, TransferDefaults } from '../../transfer.types';
import { TransferFormComponent } from './transfer-form.component';

const account = (id: string, archivedAt: string | null = null): AccountDto => ({
    id,
    householdId: 'h1',
    number: 1,
    description: id,
    type: 'checking',
    currency: 'CHF',
    initialValue: 0,
    amount: 0,
    startDate: '2026-01-01T00:00:00.000Z',
    archivedAt,
    createdAt: '2026-01-01T00:00:00.000Z',
});

describe('TransferFormComponent', () => {
    const accounts = signal<AccountDto[]>([]);
    const defaults = signal<TransferDefaults>({});

    function create() {
        const fixture = TestBed.createComponent(TransferFormComponent, {
            bindings: [
                inputBinding('accounts', accounts),
                inputBinding('defaults', defaults),
            ],
        });
        fixture.detectChanges();
        const emitted: CreateTransferDto[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { fixture, form: fixture.componentInstance, emitted };
    }

    beforeEach(() => {
        accounts.set([
            account('checking'),
            account('savings'),
            account('card'),
        ]);
        defaults.set({});
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('starts empty among several accounts, dated now', () => {
        const { form } = create();
        const value = form.form.getRawValue();

        expect(value.fromAccountId).toBe('');
        expect(value.toAccountId).toBe('');
        expect(
            Math.abs(new Date(value.date).getTime() - Date.now()),
        ).toBeLessThan(60_000);
    });

    it('settling: prefills card and debt, keeps the card out of the payers', () => {
        defaults.set({
            toAccountId: 'card',
            amount: 12345,
            fromAccountId: 'card',
        });
        const { form } = create();

        expect(form.form.controls.toAccountId.value).toBe('card');
        expect(form.form.controls.amount.value).toBe(123.45);
        expect(form.form.controls.fromAccountId.value).toBe('');
    });

    it('preselects the remembered payer', () => {
        defaults.set({ toAccountId: 'card', fromAccountId: 'savings' });
        const { form } = create();

        expect(form.form.controls.fromAccountId.value).toBe('savings');
    });

    it('picks the other account when only two exist', () => {
        accounts.set([account('checking'), account('card')]);
        defaults.set({ toAccountId: 'card' });
        const { form } = create();

        expect(form.form.controls.fromAccountId.value).toBe('checking');
    });

    it('never offers the payer as receiver', () => {
        const { fixture, form } = create();
        form.form.controls.fromAccountId.setValue('checking');
        fixture.detectChanges();

        expect(form.toAccounts().map((a) => a.id)).toEqual(['savings', 'card']);
    });

    it('drops a receiver once it becomes the payer', () => {
        defaults.set({ toAccountId: 'card' });
        const { fixture, form } = create();
        form.form.controls.fromAccountId.setValue('card');
        fixture.detectChanges();

        expect(form.form.controls.toAccountId.value).toBe('');
    });

    it('hides accounts archived at the chosen date', () => {
        accounts.set([
            account('checking'),
            account('old', '2026-01-01T00:00:00.000Z'),
        ]);
        const { form } = create();

        expect(form.activeAccounts().map((a) => a.id)).toEqual(['checking']);
    });

    it('emits minor units, a trimmed or null title and a UTC instant', () => {
        const { form, emitted } = create();
        form.form.setValue({
            amount: 20.5,
            fromAccountId: 'checking',
            toAccountId: 'card',
            date: '2026-02-01T12:00',
            title: '  ',
        });
        form.submit();

        expect(emitted).toEqual([
            {
                fromAccountId: 'checking',
                toAccountId: 'card',
                amount: 2050,
                title: null,
                date: new Date('2026-02-01T12:00').toISOString(),
            },
        ]);
    });

    it('does not emit while invalid', () => {
        const { form, emitted } = create();
        form.submit();
        expect(emitted).toEqual([]);
    });
});
