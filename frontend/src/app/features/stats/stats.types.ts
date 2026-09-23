import { formatDate } from '@angular/common';
import type { CurrencyStatsDto } from '../../core/api';

export type { CurrencyStatsDto };

export type PeriodKind = 'week' | 'month' | 'year';

/** A calendar period identified by its kind and its first day (local midnight). */
export interface Period {
    kind: PeriodKind;
    start: Date;
}

/** Half-open: `from` inclusive, `to` exclusive. */
export interface DateRange {
    from: Date;
    to: Date;
}

function atMidnight(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday of the week containing `d`, local midnight. */
function startOfWeek(d: Date): Date {
    const monday = atMidnight(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
}

/** The period of `kind` that contains `date` (defaults to now). */
export function periodOf(kind: PeriodKind, date = new Date()): Period {
    switch (kind) {
        case 'week':
            return { kind, start: startOfWeek(date) };
        case 'month':
            return {
                kind,
                start: new Date(date.getFullYear(), date.getMonth(), 1),
            };
        case 'year':
            return { kind, start: new Date(date.getFullYear(), 0, 1) };
    }
}

/** Neighbouring period; `steps` may be negative. Date math is calendar-based so DST does not drift. */
export function shiftPeriod(period: Period, steps: number): Period {
    const { start, kind } = period;
    switch (kind) {
        case 'week':
            return {
                kind,
                start: new Date(
                    start.getFullYear(),
                    start.getMonth(),
                    start.getDate() + 7 * steps,
                ),
            };
        case 'month':
            return {
                kind,
                start: new Date(
                    start.getFullYear(),
                    start.getMonth() + steps,
                    1,
                ),
            };
        case 'year':
            return { kind, start: new Date(start.getFullYear() + steps, 0, 1) };
    }
}

export function periodRange(period: Period): DateRange {
    return { from: period.start, to: shiftPeriod(period, 1).start };
}

export function isSamePeriod(a: Period, b: Period): boolean {
    return a.kind === b.kind && a.start.getTime() === b.start.getTime();
}

/** "Sep 2026", "7–13 Sep 2026" (week), "2026". */
export function periodLabel(period: Period, locale: string): string {
    const { start, kind } = period;
    switch (kind) {
        case 'month':
            return formatDate(start, 'MMM y', locale);
        case 'year':
            return formatDate(start, 'y', locale);
        case 'week': {
            const end = new Date(
                start.getFullYear(),
                start.getMonth(),
                start.getDate() + 6,
            );
            const sameMonth = start.getMonth() === end.getMonth();
            const first = formatDate(start, sameMonth ? 'd' : 'd MMM', locale);
            return `${first}–${formatDate(end, 'd MMM y', locale)}`;
        }
    }
}

/** URL form: `?period=month&start=2026-09-01`. */
export function toPeriodParams(period: Period): {
    period: PeriodKind;
    start: string;
} {
    return {
        period: period.kind,
        start: formatDate(period.start, 'yyyy-MM-dd', 'en'),
    };
}

const KINDS: PeriodKind[] = ['week', 'month', 'year'];

/** Lenient: an unknown kind falls back to month, a bad start to the current period of that kind. */
export function parsePeriodParams(
    kind: string | undefined,
    start: string | undefined,
    now = new Date(),
): Period {
    const safeKind = KINDS.includes(kind as PeriodKind)
        ? (kind as PeriodKind)
        : 'month';
    const match = start && /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
    if (!match) return periodOf(safeKind, now);
    const [year, month, day] = [match[1], match[2], match[3]].map(Number);
    const parsed = new Date(year, month - 1, day);
    // `Date` rolls impossible days over (2026-02-30 → March 2); only a round-trip proves it existed.
    if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
        return periodOf(safeKind, now);
    }
    // Normalise so a mid-period start still resolves to its period.
    return periodOf(safeKind, parsed);
}
