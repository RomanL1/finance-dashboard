import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { CurrencyStatsDto } from '../../stats.types';
import { StatsCardComponent } from './stats-card.component';

describe('StatsCardComponent', () => {
    const stats = signal<CurrencyStatsDto>({
        currency: 'CHF',
        income: 0,
        expenses: 0,
        net: 0,
    });

    function create(income: number, expenses: number) {
        stats.set({
            currency: 'CHF',
            income,
            expenses,
            net: income - expenses,
        });
        const fixture = TestBed.createComponent(StatsCardComponent, {
            bindings: [inputBinding('stats', stats)],
        });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        return el.querySelector<HTMLElement>('[role="img"] > div');
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('hides the bar when nothing happened', () => {
        expect(create(0, 0)).toBeNull();
    });

    it('sizes the expense bar against the income', () => {
        expect(create(10000, 2500)!.style.width).toBe('25%');
    });

    it('fills the bar when expenses exceed the income', () => {
        expect(create(1000, 4000)!.style.width).toBe('100%');
        expect(create(0, 500)!.style.width).toBe('100%');
    });
});
