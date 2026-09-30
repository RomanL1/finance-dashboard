import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { InvitationFormComponent } from './invitation-form.component';

describe('InvitationFormComponent', () => {
    const busy = signal(false);
    const errorMessage = signal<string | null>(null);

    beforeEach(() => {
        busy.set(false);
        errorMessage.set(null);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    function create() {
        const fixture = TestBed.createComponent(InvitationFormComponent, {
            bindings: [
                inputBinding('busy', busy),
                inputBinding('errorMessage', errorMessage),
            ],
        });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const submitted: string[] = [];
        fixture.componentInstance.submitted.subscribe((n) => submitted.push(n));
        const input = el.querySelector('input')!;
        const type = (value: string) => {
            input.value = value;
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
        };
        const submit = () => {
            el.querySelector('form')!.dispatchEvent(
                new Event('submit', { cancelable: true }),
            );
            fixture.detectChanges();
        };
        const button = () => el.querySelector<HTMLButtonElement>('button')!;
        return { el, input, type, submit, submitted, button };
    }

    it('submits without a note', () => {
        const { submit, submitted } = create();
        submit();
        expect(submitted).toEqual(['']);
    });

    it('submits the trimmed note and empties the field', () => {
        const { type, submit, submitted, input } = create();
        type('  For Anna ');
        submit();
        expect(submitted).toEqual(['For Anna']);
        expect(input.value).toBe('');
    });

    it('accepts 50 characters and refuses 51', () => {
        const { type, submit, submitted, button } = create();

        type('x'.repeat(51));
        expect(button().disabled).toBe(true);
        submit();
        expect(submitted).toEqual([]);

        type('x'.repeat(50));
        expect(button().disabled).toBe(false);
        submit();
        expect(submitted).toEqual(['x'.repeat(50)]);
    });

    it('does not submit while busy', () => {
        busy.set(true);
        const { submit, submitted, button } = create();
        expect(button().disabled).toBe(true);
        submit();
        expect(submitted).toEqual([]);
    });

    it('shows the error it is given', () => {
        errorMessage.set('Too many');
        const { el } = create();
        expect(el.querySelector('[role="alert"]')?.textContent).toContain(
            'Too many',
        );
    });
});
