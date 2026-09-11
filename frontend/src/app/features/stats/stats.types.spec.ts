import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {
    parsePeriodParams,
    periodLabel,
    periodOf,
    periodRange,
    shiftPeriod,
    toPeriodParams,
    withEmptyCurrencies,
} from './stats.types';

registerLocaleData(localeDe);

/** Tuesday 2026-09-08 */
const NOW = new Date(2026, 8, 8, 15, 30);

describe('periodOf', () => {
    it('week starts on Monday at local midnight', () => {
        expect(periodOf('week', NOW).start).toEqual(new Date(2026, 8, 7));
    });
    it('sunday belongs to the week that started the previous monday', () => {
        expect(periodOf('week', new Date(2026, 8, 13)).start).toEqual(
            new Date(2026, 8, 7),
        );
    });
    it('month and year start on their first day', () => {
        expect(periodOf('month', NOW).start).toEqual(new Date(2026, 8, 1));
        expect(periodOf('year', NOW).start).toEqual(new Date(2026, 0, 1));
    });
});

describe('shiftPeriod / periodRange', () => {
    it('crosses year boundaries', () => {
        expect(
            shiftPeriod(periodOf('month', new Date(2026, 11, 5)), 1).start,
        ).toEqual(new Date(2027, 0, 1));
        expect(
            shiftPeriod(periodOf('month', new Date(2026, 0, 5)), -1).start,
        ).toEqual(new Date(2025, 11, 1));
        expect(
            shiftPeriod(periodOf('week', new Date(2026, 11, 30)), 1).start,
        ).toEqual(new Date(2027, 0, 4));
    });
    it('range end is the next period start (exclusive)', () => {
        expect(periodRange(periodOf('month', NOW))).toEqual({
            from: new Date(2026, 8, 1),
            to: new Date(2026, 9, 1),
        });
        expect(periodRange(periodOf('week', NOW))).toEqual({
            from: new Date(2026, 8, 7),
            to: new Date(2026, 8, 14),
        });
    });
    it('week ranges span DST changes without drifting', () => {
        // Last Sunday in October 2026 (Europe DST end) is the 25th.
        const range = periodRange(periodOf('week', new Date(2026, 9, 21)));
        expect(range.from).toEqual(new Date(2026, 9, 19));
        expect(range.to).toEqual(new Date(2026, 9, 26));
    });
});

describe('periodLabel', () => {
    it('labels month, year and week', () => {
        expect(periodLabel(periodOf('month', NOW), 'en')).toBe('Sep 2026');
        expect(periodLabel(periodOf('year', NOW), 'en')).toBe('2026');
        expect(periodLabel(periodOf('week', NOW), 'en')).toBe('7–13 Sep 2026');
    });
    it('shows both months for a week that spans two', () => {
        expect(periodLabel(periodOf('week', new Date(2026, 8, 30)), 'en')).toBe(
            '28 Sep–4 Oct 2026',
        );
    });
});

describe('period url params', () => {
    it('round-trips', () => {
        const period = periodOf('week', NOW);
        expect(toPeriodParams(period)).toEqual({
            period: 'week',
            start: '2026-09-07',
        });
        expect(parsePeriodParams('week', '2026-09-07', NOW)).toEqual(period);
    });
    it('normalises a mid-period start', () => {
        expect(parsePeriodParams('month', '2026-09-20', NOW)).toEqual(
            periodOf('month', NOW),
        );
    });
    it('falls back to the current month on garbage', () => {
        expect(parsePeriodParams('decade', 'nope', NOW)).toEqual(
            periodOf('month', NOW),
        );
        expect(parsePeriodParams(undefined, undefined, NOW)).toEqual(
            periodOf('month', NOW),
        );
        expect(parsePeriodParams('week', '2026-13-40', NOW).kind).toBe('week');
    });
});

describe('withEmptyCurrencies', () => {
    it('adds zero rows for missing currencies and sorts', () => {
        expect(
            withEmptyCurrencies(
                [{ currency: 'EUR', income: 1, expenses: 2, net: -1 }],
                ['CHF', 'EUR'],
            ),
        ).toEqual([
            { currency: 'CHF', income: 0, expenses: 0, net: 0 },
            { currency: 'EUR', income: 1, expenses: 2, net: -1 },
        ]);
    });
});
