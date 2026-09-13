/** FNV-1a 32-bit hash: cheap, stable, spreads short ids well enough for a hue. */
function fnv1a(text: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/** Hue in degrees derived from the id, never the name, so renaming keeps the color. */
export function categoryHue(id: string): number {
    return fnv1a(id) % 360;
}

/**
 * Category avatar background as a `light-dark()` pair: same lightness and chroma for every
 * category, only the hue differs, so all avatars carry the same visual weight.
 */
export function categoryColor(id: string): string {
    return `light-dark(${categorySchemeColor(id, 'light')}, ${categorySchemeColor(id, 'dark')})`;
}

/** One side of the pair, for canvas drawings that cannot resolve `light-dark()`. */
export function categorySchemeColor(
    id: string,
    scheme: 'light' | 'dark',
): string {
    const hue = categoryHue(id);
    return scheme === 'light'
        ? `oklch(0.58 0.12 ${hue})`
        : `oklch(0.72 0.11 ${hue})`;
}
