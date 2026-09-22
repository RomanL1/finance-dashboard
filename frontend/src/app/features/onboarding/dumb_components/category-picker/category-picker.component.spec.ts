import { inputBinding, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { CategorySelection } from '../../onboarding.types';
import { CategoryPickerComponent } from './category-picker.component';

describe('CategoryPickerComponent', () => {
    let fixture: ComponentFixture<CategoryPickerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CategoryPickerComponent],
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CategoryPickerComponent, {
            bindings: [
                inputBinding(
                    'categories',
                    signal([
                        { translateKey: 'GROCERIES' },
                        { translateKey: 'MISC' },
                    ]),
                ),
            ],
        });
        fixture.detectChanges();
    });

    it('starts with Miscellaneous ticked, but it can be unticked', () => {
        const picker = fixture.componentInstance;
        expect(picker.selected().has('MISC')).toBe(true);

        picker.toggle('MISC');

        expect(picker.selected().has('MISC')).toBe(false);
    });

    it('deselect all leaves nothing ticked and blocks submit', () => {
        const picker = fixture.componentInstance;
        let emitted: CategorySelection | undefined;
        picker.submitted.subscribe((s: CategorySelection) => (emitted = s));

        picker.toggleAll();
        picker.toggleAll();
        picker.submit();

        expect(picker.selected().size).toBe(0);
        expect(picker.hasSelection()).toBe(false);
        expect(emitted).toBeUndefined();
    });

    it('a custom name alone is enough to submit', () => {
        const picker = fixture.componentInstance;
        let emitted: CategorySelection | undefined;
        picker.submitted.subscribe((s: CategorySelection) => (emitted = s));

        picker.toggle('MISC');
        picker.customForm.controls.name.setValue('Pets');
        picker.addCustom();
        picker.submit();

        expect(emitted).toEqual({ translateKeys: [], customNames: ['Pets'] });
    });
});
