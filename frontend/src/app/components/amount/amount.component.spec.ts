import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../testing/local-storage';
import {
    PrivacyService,
    type FigureKind,
} from '../../core/privacy/privacy.service';
import { AmountComponent } from './amount.component';

@Component({
    imports: [AmountComponent],
    template: `<app-amount
        [amount]="amount()"
        currency="CHF"
        [showPlus]="showPlus()"
        [showCurrency]="showCurrency()"
        [kind]="kind()"
    />`,
})
class HostComponent {
    readonly amount = signal(0);
    readonly showPlus = signal(true);
    readonly showCurrency = signal(true);
    readonly kind = signal<FigureKind>('transaction');
}

describe('AmountComponent', () => {
    function render(
        amount: number,
        showPlus = true,
        showCurrency = true,
    ): string {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.amount.set(amount);
        fixture.componentInstance.showPlus.set(showPlus);
        fixture.componentInstance.showCurrency.set(showCurrency);
        fixture.detectChanges();
        // Spacing between number and currency is a CSS gap, so join the spans explicitly.
        const spans = (fixture.nativeElement as HTMLElement).querySelectorAll(
            'span > span',
        );
        return [...spans].map((s) => s.textContent!.trim()).join(' ');
    }

    beforeEach(async () => {
        stubLocalStorage();
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
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

    it('drops the currency code for dense lists', () => {
        expect(render(-1250, true, false)).toBe('−12.50');
    });

    it.each<[FigureKind, FigureKind]>([
        ['balance', 'transaction'],
        ['transaction', 'balance'],
    ])(
        'blurs a %s only while its own toggle is on, keeping the text',
        (kind, other) => {
            const fixture = TestBed.createComponent(HostComponent);
            fixture.componentInstance.amount.set(-1250);
            fixture.componentInstance.kind.set(kind);
            fixture.detectChanges();
            const figure = (fixture.nativeElement as HTMLElement).querySelector(
                'app-amount > span',
            )!;
            const privacy = TestBed.inject(PrivacyService);
            const hide = (k: FigureKind) =>
                k === 'balance'
                    ? privacy.setHideBalances(true)
                    : privacy.setHideTransactions(true);

            hide(other);
            fixture.detectChanges();
            expect(figure.classList).not.toContain('blur-sm');

            hide(kind);
            fixture.detectChanges();
            expect(figure.classList).toContain('blur-sm');
            expect(figure.textContent).toContain('12.50');
        },
    );
});
