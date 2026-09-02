import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, DomainErrorKind } from '../../kernel/index.js';

const STATUS: Record<DomainErrorKind, HttpStatus> = {
    not_found: HttpStatus.NOT_FOUND,
    forbidden: HttpStatus.FORBIDDEN,
    conflict: HttpStatus.CONFLICT,
    validation: HttpStatus.BAD_REQUEST,
};

/** Translates domain errors thrown by services into HTTP responses. Services stay HTTP-agnostic. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
    catch(error: DomainError, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();
        const status = STATUS[error.kind];
        response.status(status).json({
            statusCode: status,
            error: error.name,
            message: error.message,
        });
    }
}
