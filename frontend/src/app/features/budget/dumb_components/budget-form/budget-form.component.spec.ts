import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BudgetFormComponent } from './budget-form.component';

describe('BudgetFormComponent', () => {
    const defaultAmount = signal<number | null>(null);
    const busy = signal(false);
    const errorMessage = signal<string | null>(null);

    function create() {
        const fixture = TestBed.createComponent(BudgetFormComponent, {
            bindings: [
                inputBinding('formId', () => 'budget-form'),
                inputBinding('currency', () => 'CHF'),
                inputBinding('defaultAmount', defaultAmount),
                inputBinding('busy', busy),
                inputBinding('errorMessage', errorMessage),
            ],
        });
        fixture.detectChanges();
        const emitted: number[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { fixture, form: fixture.componentInstance, emitted };
    }

    beforeEach(() => {
        defaultAmount.set(null);
        busy.set(false);
        errorMessage.set(null);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('starts empty and does not submit without an amount', () => {
        const { form, emitted } = create();

        expect(form.form.controls.amount.value).toBeNull();
        form.submit();

        expect(emitted).toEqual([]);
    });

    it('prefills the current limit in major units', () => {
        defaultAmount.set(12345);
        const { form } = create();

        expect(form.form.controls.amount.value).toBe(123.45);
    });

    it('emits minor units, rounding float noise', () => {
        const { form, emitted } = create();

        form.form.setValue({ amount: 0.29 });
        form.submit();
        form.form.setValue({ amount: 0 });
        form.submit();

        expect(emitted).toEqual([29, 0]);
    });

    it('rejects a negative amount', () => {
        const { form, emitted } = create();

        form.form.setValue({ amount: -1 });
        form.submit();

        expect(form.form.invalid).toBe(true);
        expect(emitted).toEqual([]);
    });

    it('does not submit while busy', () => {
        busy.set(true);
        const { form, emitted } = create();

        form.form.setValue({ amount: 5 });
        form.submit();

        expect(emitted).toEqual([]);
    });

    it('shows the id, the currency and an error message', () => {
        errorMessage.set('Server says no');
        const { fixture } = create();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('form')!.id).toBe('budget-form');
        expect(el.textContent).toContain('CHF');
        expect(el.querySelector('[role="alert"]')!.textContent).toContain(
            'Server says no',
        );
    });
});
