import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AmountComponent } from './amount.component';

@Component({
    imports: [AmountComponent],
    template: `<app-amount
        [amount]="amount()"
        currency="CHF"
        [showPlus]="showPlus()"
    />`,
})
class HostComponent {
    readonly amount = signal(0);
    readonly showPlus = signal(true);
}

describe('AmountComponent', () => {
    function render(amount: number, showPlus = true): string {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.amount.set(amount);
        fixture.componentInstance.showPlus.set(showPlus);
        fixture.detectChanges();
        // Spacing between number and currency is a CSS gap, so join the spans explicitly.
        const spans = (fixture.nativeElement as HTMLElement).querySelectorAll(
            'span > span',
        );
        return [...spans].map((s) => s.textContent!.trim()).join(' ');
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();
    });

    it('formats an expense with a real minus sign', () => {
        expect(render(-1250)).toBe('−12.50 CHF');
    });

    it('formats income with a plus', () => {
        expect(render(1250)).toBe('+12.50 CHF');
    });

    it('drops the plus for balances', () => {
        expect(render(1250, false)).toBe('12.50 CHF');
    });

    it('renders zero unsigned', () => {
        expect(render(0)).toBe('0.00 CHF');
    });
});
