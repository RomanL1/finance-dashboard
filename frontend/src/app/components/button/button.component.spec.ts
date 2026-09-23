import { inputBinding, outputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonComponent, IconButtonComponent } from './button.component';

describe('ButtonComponent', () => {
    it('is a plain button by default and re-emits clicks', () => {
        const clicked = vi.fn();
        const fixture = TestBed.createComponent(ButtonComponent, {
            bindings: [outputBinding('clicked', clicked)],
        });
        fixture.detectChanges();
        const button: HTMLButtonElement =
            fixture.nativeElement.querySelector('button');

        button.click();

        expect(button.type).toBe('button');
        expect(button.hasAttribute('form')).toBe(false);
        expect(button.hasAttribute('aria-label')).toBe(false);
        expect(clicked).toHaveBeenCalledOnce();
    });

    it('submits a form it is not nested in', () => {
        const fixture = TestBed.createComponent(ButtonComponent, {
            bindings: [
                inputBinding('type', () => 'submit'),
                inputBinding('formId', () => 'budget-form'),
                inputBinding('ariaLabel', () => 'Save'),
            ],
        });
        fixture.detectChanges();
        const button: HTMLButtonElement =
            fixture.nativeElement.querySelector('button');

        expect(button.type).toBe('submit');
        expect(button.getAttribute('form')).toBe('budget-form');
        expect(button.getAttribute('aria-label')).toBe('Save');
    });

    it('swallows clicks while disabled', () => {
        const clicked = vi.fn();
        const disabled = signal(true);
        const fixture = TestBed.createComponent(ButtonComponent, {
            bindings: [
                inputBinding('disabled', disabled),
                outputBinding('clicked', clicked),
            ],
        });
        fixture.detectChanges();
        const button: HTMLButtonElement =
            fixture.nativeElement.querySelector('button');

        button.click();

        expect(button.disabled).toBe(true);
        expect(clicked).not.toHaveBeenCalled();
    });
});

describe('IconButtonComponent', () => {
    it('carries an accessible name and pressed state', () => {
        const clicked = vi.fn();
        const fixture = TestBed.createComponent(IconButtonComponent, {
            bindings: [
                inputBinding('ariaLabel', () => 'Show password'),
                inputBinding('ariaPressed', () => false),
                outputBinding('clicked', clicked),
            ],
        });
        fixture.detectChanges();
        const button: HTMLButtonElement =
            fixture.nativeElement.querySelector('button');

        button.click();

        expect(button.getAttribute('aria-label')).toBe('Show password');
        expect(button.getAttribute('aria-pressed')).toBe('false');
        expect(clicked).toHaveBeenCalledOnce();
    });

    it('omits aria-pressed for a plain action', () => {
        const fixture = TestBed.createComponent(IconButtonComponent);
        fixture.detectChanges();

        expect(
            fixture.nativeElement
                .querySelector('button')
                .hasAttribute('aria-pressed'),
        ).toBe(false);
    });
});
