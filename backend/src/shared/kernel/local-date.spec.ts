import { describe, expect, it } from 'vitest';
import {
    addYears,
    dateInMonth,
    endOfMonth,
    isLocalDate,
    isValidTimeZone,
    isoWeekday,
    startOfDayIn,
    todayIn,
} from './local-date.js';

describe('local dates', () => {
    it('validates real calendar dates only', () => {
        expect(isLocalDate('2028-02-29')).toBe(true);
        expect(isLocalDate('2026-02-29')).toBe(false);
        expect(isLocalDate('2026-1-01')).toBe(false);
    });

    it('clamps to the last day of shorter months', () => {
        expect(dateInMonth(2026, 1, 31)).toBe('2026-02-28');
        expect(dateInMonth(2026, 3, 31)).toBe('2026-04-30');
        expect(addYears('2028-02-29', -1)).toBe('2027-02-28');
        expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
        expect(endOfMonth('2026-12-31')).toBe('2026-12-31');
    });

    it('numbers weekdays ISO style', () => {
        expect(isoWeekday('2026-09-28')).toBe(1);
        expect(isoWeekday('2026-09-27')).toBe(7);
    });

    it('knows the date in a zone', () => {
        const instant = new Date('2026-09-26T22:30:00.000Z');
        expect(todayIn('Europe/Zurich', instant)).toBe('2026-09-27');
        expect(todayIn('America/New_York', instant)).toBe('2026-09-26');
    });

    it('finds local midnight, also on DST change days', () => {
        expect(startOfDayIn('2026-01-15', 'Europe/Zurich').toISOString()).toBe(
            '2026-01-14T23:00:00.000Z',
        );
        expect(startOfDayIn('2026-07-15', 'Europe/Zurich').toISOString()).toBe(
            '2026-07-14T22:00:00.000Z',
        );
        // Clocks go forward on 29 Mar and back on 25 Oct 2026; midnight is before either switch.
        expect(startOfDayIn('2026-03-29', 'Europe/Zurich').toISOString()).toBe(
            '2026-03-28T23:00:00.000Z',
        );
        expect(startOfDayIn('2026-10-25', 'Europe/Zurich').toISOString()).toBe(
            '2026-10-24T22:00:00.000Z',
        );
        expect(
            startOfDayIn('2026-01-15', 'America/New_York').toISOString(),
        ).toBe('2026-01-15T05:00:00.000Z');
        expect(startOfDayIn('2026-01-15', 'UTC').toISOString()).toBe(
            '2026-01-15T00:00:00.000Z',
        );
    });

    it('recognizes IANA zones', () => {
        expect(isValidTimeZone('Europe/Zurich')).toBe(true);
        expect(isValidTimeZone('Mars/Base')).toBe(false);
    });
});
