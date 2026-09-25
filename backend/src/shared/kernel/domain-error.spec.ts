import { describe, expect, it } from 'vitest';
import {
    ConflictError,
    DomainError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from './domain-error.js';

describe('DomainError family', () => {
    it.each([
        [new NotFoundError('Account'), 'not_found', 'NotFoundError'],
        [new ForbiddenError(), 'forbidden', 'ForbiddenError'],
        [new ConflictError('taken'), 'conflict', 'ConflictError'],
        [new ValidationError('bad'), 'validation', 'ValidationError'],
    ])('%s has kind %s and the subclass name', (error, kind, name) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
        expect(error.kind).toBe(kind);
        expect(error.name).toBe(name);
    });

    it('NotFoundError names the entity and, when given, the id', () => {
        expect(new NotFoundError('Account').message).toBe('Account not found');
        expect(new NotFoundError('Account', 'acc-1').message).toBe(
            'Account acc-1 not found',
        );
    });

    it('ForbiddenError falls back to a generic message', () => {
        expect(new ForbiddenError().message).toBe('Operation not allowed');
        expect(new ForbiddenError('Owners only').message).toBe('Owners only');
    });
});
