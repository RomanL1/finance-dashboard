import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/kernel/index.js';
import { buildAccount, buildAccountUpdate } from './account.js';

const input = {
    description: '  Checking  ',
    type: 'checking' as const,
    currency: 'CHF',
    initialValue: 1000,
    startDate: new Date('2026-01-01'),
};

describe('buildAccount', () => {
    it('trims the description, keeps the initial value and defaults archivedAt to null', () => {
        expect(buildAccount(input)).toEqual({
            id: expect.any(String),
            description: 'Checking',
            type: 'checking',
            currency: 'CHF',
            initialValue: 1000,
            startDate: input.startDate,
            archivedAt: null,
        });
    });

    it('generates a fresh id every time', () => {
        expect(buildAccount(input).id).not.toBe(buildAccount(input).id);
    });

    it.each(['', '   '])('rejects the description %j', (description) => {
        expect(() => buildAccount({ ...input, description })).toThrow(
            ValidationError,
        );
    });

    it('rejects a missing description from a caller that skipped validation', () => {
        expect(() =>
            // @ts-expect-error: typed callers cannot omit it; the domain still guards untyped input.
            buildAccount({ ...input, description: undefined }),
        ).toThrow(ValidationError);
    });
});

describe('buildAccountUpdate', () => {
    it('carries archivedAt and leaves out the initial value', () => {
        const archivedAt = new Date('2026-06-01');
        const { initialValue: _fixed, ...editable } = input;

        const update = buildAccountUpdate({ ...editable, archivedAt });

        expect(update.archivedAt).toBe(archivedAt);
        expect(update).not.toHaveProperty('initialValue');
    });
});
