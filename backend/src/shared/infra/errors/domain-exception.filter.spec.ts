import { HttpStatus } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
    ConflictError,
    type DomainError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from '../../kernel/index.js';
import { DomainExceptionFilter } from './domain-exception.filter.js';

function makeHost() {
    const response = {
        status: vi.fn<Response['status']>().mockReturnThis(),
        json: vi.fn<Response['json']>().mockReturnThis(),
    } satisfies Pick<Response, 'status' | 'json'>;
    const host = new ExecutionContextHost([{}, response]);
    return { host, response };
}

describe('DomainExceptionFilter', () => {
    it.each<[DomainError, HttpStatus]>([
        [new NotFoundError('Account', 'acc-1'), HttpStatus.NOT_FOUND],
        [new ForbiddenError(), HttpStatus.FORBIDDEN],
        [new ConflictError('taken'), HttpStatus.CONFLICT],
        [new ValidationError('bad'), HttpStatus.BAD_REQUEST],
    ])('maps %s to %i', (error, status) => {
        const { host, response } = makeHost();

        new DomainExceptionFilter().catch(error, host);

        expect(response.status).toHaveBeenCalledWith(status);
        expect(response.json).toHaveBeenCalledWith({
            statusCode: status,
            error: error.name,
            message: error.message,
        });
    });
});
