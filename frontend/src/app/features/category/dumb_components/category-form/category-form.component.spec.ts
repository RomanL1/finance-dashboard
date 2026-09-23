import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { CategoryDto, CreateCategoryDto } from '../../category.types';
import { CategoryFormComponent } from './category-form.component';

describe('CategoryFormComponent', () => {
    const formId = signal<string | null>(null);
    const defaults = signal<CategoryDto | null>(null);
    const busy = signal(false);

    function create() {
        const fixture = TestBed.createComponent(CategoryFormComponent, {
            bindings: [
                inputBinding('formId', formId),
                inputBinding('defaults', defaults),
                inputBinding('busy', busy),
            ],
        });
        fixture.detectChanges();
        const emitted: CreateCategoryDto[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { fixture, form: fixture.componentInstance, emitted };
    }

    const submitButton = (el: HTMLElement) =>
        el.querySelector<HTMLButtonElement>('button[type="submit"]');

    beforeEach(() => {
        formId.set(null);
        defaults.set(null);
        busy.set(false);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('emits the trimmed name', () => {
        const { form, emitted } = create();

        form.form.setValue({ name: '  Pets  ' });
        form.submit();

        expect(emitted).toEqual([{ name: 'Pets' }]);
    });

    it('does not emit a blank name', () => {
        const { form, emitted } = create();

        form.submit();
        form.form.setValue({ name: '   ' });
        form.submit();

        expect(emitted).toEqual([]);
    });

    it('rejects names over 100 characters', () => {
        const { form, emitted } = create();

        form.form.setValue({ name: 'x'.repeat(101) });
        form.submit();

        expect(form.form.controls.name.hasError('maxlength')).toBe(true);
        expect(emitted).toEqual([]);
    });

    it('prefills the name when renaming', () => {
        defaults.set({
            id: 'c1',
            name: 'Food',
            createdAt: '',
            transactionCount: 0,
        });
        const { form } = create();

        expect(form.form.controls.name.value).toBe('Food');
    });

    it('renders its own submit button, disabled while invalid or busy', () => {
        const { fixture, form } = create();
        const el = fixture.nativeElement as HTMLElement;
        expect(submitButton(el)!.disabled).toBe(true);

        form.form.setValue({ name: 'Pets' });
        fixture.detectChanges();
        expect(submitButton(el)!.disabled).toBe(false);

        busy.set(true);
        fixture.detectChanges();
        expect(submitButton(el)!.disabled).toBe(true);
    });

    it('leaves the button to the dialog when it owns the form id', () => {
        formId.set('category-form');
        const { fixture } = create();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('form')!.id).toBe('category-form');
        expect(submitButton(el)).toBeNull();
    });
});
