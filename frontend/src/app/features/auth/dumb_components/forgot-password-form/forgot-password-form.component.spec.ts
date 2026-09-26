import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ForgotPasswordFormComponent } from './forgot-password-form.component';

describe('ForgotPasswordFormComponent', () => {
    function create() {
        const fixture = TestBed.createComponent(ForgotPasswordFormComponent);
        fixture.detectChanges();
        const emitted: string[] = [];
        fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
        return { form: fixture.componentInstance, emitted };
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('emits a valid email only', () => {
        const { form, emitted } = create();

        form.form.controls.email.setValue('nope');
        form.submit();
        form.form.controls.email.setValue('ann@finance.local');
        form.submit();

        expect(emitted).toEqual(['ann@finance.local']);
    });
});
