import { categoryColor, categoryHue } from './category-color';

describe('categoryHue', () => {
    it('is stable for the same id', () => {
        expect(categoryHue('abc')).toBe(categoryHue('abc'));
    });

    it('stays within 0..359', () => {
        for (const id of ['', 'a', 'cat-1', 'cat-2', 'x'.repeat(40)]) {
            const hue = categoryHue(id);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        }
    });

    it('differs for neighbouring ids', () => {
        expect(categoryHue('cat-1')).not.toBe(categoryHue('cat-2'));
    });
});

describe('categoryColor', () => {
    it('renders a light-dark pair with the hue', () => {
        const hue = categoryHue('cat-1');
        expect(categoryColor('cat-1')).toBe(
            `light-dark(oklch(0.58 0.12 ${hue}), oklch(0.72 0.11 ${hue}))`,
        );
    });
});
