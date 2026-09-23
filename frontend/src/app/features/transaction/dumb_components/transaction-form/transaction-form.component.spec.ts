import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import type {
    CreateTransactionDto,
    TransactionDefaults,
} from '../../transaction.types';
import { TransactionFormComponent } from './transaction-form.component';

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

const category = (id: string): CategoryDto => ({
    id,
    name: id,
    createdAt: '',
    transactionCount: 0,
});

describe('TransactionFormComponent', () => {
    const accounts = signal<AccountDto[]>([]);
    const categories = signal<CategoryDto[]>([]);
    const defaults = signal<TransactionDefaults>({});

    function create() {
        const fixture = TestBed.createComponent(TransactionFormComponent, {
            bindings: [
                inputBinding('accounts', accounts),
                inputBinding('categories', categories),
                inputBinding('defaults', defaults),
            ],
        });
        fixture.detectChanges();
        const emitted: CreateTransactionDto[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { fixture, form: fixture.componentInstance, emitted };
    }

    beforeEach(() => {
        accounts.set([account('a1'), account('a2')]);
        categories.set([category('c1'), category('c2')]);
        defaults.set({});
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('starts as an expense dated now, with no account picked among several', () => {
        const { form } = create();
        const value = form.form.getRawValue();

        expect(value.type).toBe('expense');
        expect(value.accountId).toBe('');
        expect(value.categoryId).toBeNull();
        expect(
            Math.abs(new Date(value.date).getTime() - Date.now()),
        ).toBeLessThan(60_000);
    });

    it('picks the only account', () => {
        accounts.set([account('a1')]);
        const { form } = create();

        expect(form.form.controls.accountId.value).toBe('a1');
    });

    it('preselects the last-used account and category', () => {
        defaults.set({ accountId: 'a2', categoryId: 'c2' });
        const { form } = create();

        expect(form.form.controls.accountId.value).toBe('a2');
        expect(form.form.controls.categoryId.value).toBe('c2');
    });

    it('ignores last-used ids that no longer exist', () => {
        defaults.set({ accountId: 'gone', categoryId: 'gone' });
        const { form } = create();

        expect(form.form.controls.accountId.value).toBe('');
        expect(form.form.controls.categoryId.value).toBeNull();
    });

    it('prefills every field when editing', () => {
        defaults.set({
            type: 'income',
            amount: 12345,
            title: 'Salary',
            description: 'September',
            accountId: 'a1',
            categoryId: 'c1',
            date: '2026-09-15T08:30:00.000Z',
        });
        const { form } = create();

        expect(form.form.getRawValue()).toMatchObject({
            type: 'income',
            amount: 123.45,
            title: 'Salary',
            description: 'September',
            accountId: 'a1',
            categoryId: 'c1',
        });
        expect(new Date(form.form.controls.date.value).toISOString()).toBe(
            '2026-09-15T08:30:00.000Z',
        );
    });

    it('offers only accounts active at the entry date and drops a selection that is not', () => {
        accounts.set([
            account('a1'),
            account('old', '2026-06-01T00:00:00.000Z'),
        ]);
        defaults.set({ accountId: 'old', date: '2026-05-01T12:00:00.000Z' });
        const { fixture, form } = create();
        expect(form.activeAccounts().map((a) => a.id)).toEqual(['a1', 'old']);
        expect(form.form.controls.accountId.value).toBe('old');

        form.form.controls.date.setValue('2026-07-01T12:00');
        fixture.detectChanges();

        expect(form.activeAccounts().map((a) => a.id)).toEqual(['a1']);
        expect(form.form.controls.accountId.value).toBe('a1');
    });

    it('emits minor units, a UTC instant and nulls for blank text', () => {
        const { form, emitted } = create();

        form.form.setValue({
            type: 'expense',
            amount: 12.3,
            title: '  ',
            categoryId: null,
            accountId: 'a1',
            date: '2026-09-15T10:30',
            description: '  Weekly shop ',
        });
        form.submit();

        expect(emitted).toEqual([
            {
                type: 'expense',
                amount: 1230,
                title: null,
                categoryId: null,
                accountId: 'a1',
                date: new Date('2026-09-15T10:30').toISOString(),
                description: 'Weekly shop',
            },
        ]);
    });

    it.each([
        ['no amount', { amount: null }],
        ['a zero amount', { amount: 0 }],
        ['no account', { accountId: '' }],
    ])('does not emit with %s', (_case, patch) => {
        const { form, emitted } = create();
        form.form.patchValue({ amount: 10, accountId: 'a1', ...patch });

        form.submit();

        expect(emitted).toEqual([]);
    });
});
