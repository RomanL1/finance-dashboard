import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import type {
    RecurringTransactionDto,
    SaveRecurringTransactionDto,
} from '../../recurring.types';
import { RecurringFormComponent } from './recurring-form.component';

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

const rule: RecurringTransactionDto = {
    id: 'r1',
    accountId: 'a1',
    categoryId: null,
    type: 'income',
    amount: 650000,
    title: 'Salary',
    description: null,
    interval: 'weekly',
    weekday: 5,
    dayOfMonth: null,
    startDate: '2026-01-02',
    varyingAmount: false,
    weekendShift: false,
    paused: false,
    nextDate: '2026-10-02',
    createdAt: '',
};

describe('RecurringFormComponent', () => {
    const accounts = signal<AccountDto[]>([]);
    const edited = signal<RecurringTransactionDto | undefined>(undefined);

    function create() {
        const fixture = TestBed.createComponent(RecurringFormComponent, {
            bindings: [
                inputBinding('accounts', accounts),
                inputBinding('categories', () => [] as CategoryDto[]),
                inputBinding('rule', edited),
            ],
        });
        fixture.detectChanges();
        const emitted: SaveRecurringTransactionDto[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        const component = fixture.componentInstance;
        return { fixture, form: component.form, component, emitted };
    }

    beforeEach(() => {
        accounts.set([account('a1')]);
        edited.set(undefined);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('emits a monthly rule anchored on the start date', () => {
        const { form, component, emitted } = create();
        form.patchValue({ amount: 1800, startDate: '2026-01-31' });
        form.controls.weekendShift.setValue(true);

        component.submit();

        expect(emitted).toEqual([
            expect.objectContaining({
                accountId: 'a1',
                amount: 180000,
                interval: 'monthly',
                startDate: '2026-01-31',
                dayOfMonth: 31,
                weekday: null,
                weekendShift: true,
                varyingAmount: false,
            }),
        ]);
    });

    it('keeps a day of month the user picked when the start date moves', () => {
        const { form, component, emitted } = create();
        form.patchValue({ amount: 10 });
        form.controls.dayOfMonth.setValue(15);
        form.controls.dayOfMonth.markAsDirty();
        form.controls.startDate.setValue('2026-02-03');

        component.submit();

        expect(emitted[0]).toMatchObject({ dayOfMonth: 15 });
    });

    it('sends only the weekday for weekly rules and never a weekend shift', () => {
        const { form, component, emitted } = create();
        form.patchValue({ amount: 10, startDate: '2026-09-27' });
        form.controls.weekendShift.setValue(true);
        form.controls.interval.setValue('weekly');

        component.submit();

        expect(emitted[0]).toMatchObject({
            interval: 'weekly',
            weekday: 7,
            dayOfMonth: null,
            weekendShift: false,
        });
    });

    it('ignores an invalid day of month once the interval does not use it', () => {
        const { form, component, emitted } = create();
        form.patchValue({ amount: 10 });
        form.controls.dayOfMonth.setValue(40);
        component.submit();
        expect(emitted).toEqual([]);

        form.controls.interval.setValue('daily');
        component.submit();
        expect(emitted[0]).toMatchObject({
            interval: 'daily',
            dayOfMonth: null,
        });
    });

    it('does not submit without an amount', () => {
        const { component, emitted } = create();
        component.submit();
        expect(emitted).toEqual([]);
    });

    it('prefills an edited rule and keeps its archived account selectable', () => {
        accounts.set([
            account('a1', '2026-01-01T00:00:00.000Z'),
            account('a2'),
        ]);
        edited.set(rule);
        const { form, component } = create();

        expect(form.getRawValue()).toMatchObject({
            type: 'income',
            amount: 6500,
            title: 'Salary',
            interval: 'weekly',
            weekday: 5,
            accountId: 'a1',
        });
        expect(component.activeAccounts().map((a) => a.id)).toEqual([
            'a1',
            'a2',
        ]);
    });
});
