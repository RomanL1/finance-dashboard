/**
 * Calendar dates without a time of day (`YYYY-MM-DD`). Text keeps them sortable and
 * comparable with `<`; the math runs on UTC dates so no host timezone leaks in.
 */
export type LocalDate = string;

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDate(value: string): boolean {
    if (!LOCAL_DATE.test(value)) return false;
    return toLocalDate(fromLocalDate(value)) === value;
}

/** Midnight UTC of the date; only for calendar math, never shown or stored. */
export function fromLocalDate(date: LocalDate): Date {
    return new Date(`${date}T00:00:00.000Z`);
}

export function toLocalDate(date: Date): LocalDate {
    return date.toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
    const d = fromLocalDate(date);
    d.setUTCDate(d.getUTCDate() + days);
    return toLocalDate(d);
}

/** Same day of month, clamped to the target month's last day (29 Feb + 1 year = 28 Feb). */
export function addYears(date: LocalDate, years: number): LocalDate {
    const d = fromLocalDate(date);
    return dateInMonth(
        d.getUTCFullYear() + years,
        d.getUTCMonth(),
        d.getUTCDate(),
    );
}

/** Last day of the date's month. */
export function endOfMonth(date: LocalDate): LocalDate {
    const d = fromLocalDate(date);
    return dateInMonth(d.getUTCFullYear(), d.getUTCMonth(), 31);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: LocalDate): number {
    return fromLocalDate(date).getUTCDay() || 7;
}

export function dayOfMonth(date: LocalDate): number {
    return fromLocalDate(date).getUTCDate();
}

/** Month counter across years (`year * 12 + month0`), so month steps are plain additions. */
export function monthIndex(date: LocalDate): number {
    const d = fromLocalDate(date);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** The day in that month; a day the month lacks falls on its last day (story C10). */
export function dateInMonth(
    year: number,
    month0: number,
    day: number,
): LocalDate {
    const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    return toLocalDate(
        new Date(Date.UTC(year, month0, Math.min(day, lastDay))),
    );
}

export function isValidTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
    } catch {
        return false;
    }
}

/** The calendar date at `instant` in the zone. */
export function todayIn(timeZone: string, instant: Date): LocalDate {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(instant);
}

/** The instant the date starts in the zone (local midnight), DST-aware. */
export function startOfDayIn(date: LocalDate, timeZone: string): Date {
    const utcMidnight = fromLocalDate(date).getTime();
    // Two passes: the offset at the first guess can differ from the offset at the result across a DST change.
    let instant = utcMidnight - offsetAt(utcMidnight, timeZone);
    instant = utcMidnight - offsetAt(instant, timeZone);
    return new Date(instant);
}

/** Zone offset from UTC in ms at the instant. */
function offsetAt(instant: number, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).formatToParts(new Date(instant));
    const part = (type: string) =>
        Number(parts.find((p) => p.type === type)!.value);
    const asUtc = Date.UTC(
        part('year'),
        part('month') - 1,
        part('day'),
        part('hour'),
        part('minute'),
        part('second'),
    );
    return asUtc - Math.floor(instant / 1000) * 1000;
}
