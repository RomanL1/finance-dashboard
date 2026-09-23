import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { HouseholdFormComponent } from './household-form.component';

describe('HouseholdFormComponent', () => {
    const initialName = signal('');
    const busy = signal(false);
    const errorMessage = signal<string | null>(null);

    function create() {
        const fixture = TestBed.createComponent(HouseholdFormComponent, {
            bindings: [
                inputBinding('initialName', initialName),
                inputBinding('busy', busy),
                inputBinding('errorMessage', errorMessage),
            ],
        });
        fixture.detectChanges();
        const emitted: string[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { fixture, form: fixture.componentInstance, emitted };
    }

    beforeEach(() => {
        initialName.set('');
        busy.set(false);
        errorMessage.set(null);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('requires a name', () => {
        const { form, emitted } = create();

        form.submit();

        expect(form.form.controls.name.hasError('required')).toBe(true);
        expect(emitted).toEqual([]);
    });

    it('prefills a draft name and emits it', () => {
        initialName.set('Home');
        const { form, emitted } = create();

        form.submit();

        expect(emitted).toEqual(['Home']);
    });

    it('picks up a draft name that arrives later', () => {
        const { fixture, form } = create();

        initialName.set('Casa');
        fixture.detectChanges();

        expect(form.form.controls.name.value).toBe('Casa');
    });

    it('does not submit while busy and shows the error', () => {
        initialName.set('Home');
        busy.set(true);
        errorMessage.set('Name taken');
        const { fixture, form, emitted } = create();
        const el = fixture.nativeElement as HTMLElement;

        form.submit();

        expect(emitted).toEqual([]);
        expect(
            el.querySelector<HTMLButtonElement>('button[type="submit"]')!
                .disabled,
        ).toBe(true);
        expect(el.querySelector('[role="alert"]')!.textContent).toContain(
            'Name taken',
        );
    });
});
