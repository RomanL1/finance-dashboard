/** IANA zone of this browser, e.g. `Europe/Zurich`. */
export function browserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Every IANA zone the browser knows, plus `current` if it is missing (older engines omit some aliases). */
export function timeZones(current?: string): string[] {
    const zones = Intl.supportedValuesOf('timeZone');
    return current && !zones.includes(current) ? [current, ...zones] : zones;
}
