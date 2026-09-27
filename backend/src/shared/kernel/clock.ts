/** Source of "now", injected so time-driven rules (recurring transactions) are testable. */
export interface Clock {
    now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = { now: () => new Date() };
