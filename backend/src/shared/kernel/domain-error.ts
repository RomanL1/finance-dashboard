export type DomainErrorKind =
    'not_found' | 'forbidden' | 'conflict' | 'validation';

export abstract class DomainError extends Error {
    abstract readonly kind: DomainErrorKind;

    protected constructor(message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export class NotFoundError extends DomainError {
    readonly kind = 'not_found';
    constructor(entity: string, id?: string) {
        super(id ? `${entity} ${id} not found` : `${entity} not found`);
    }
}

export class ForbiddenError extends DomainError {
    readonly kind = 'forbidden';
    constructor(message = 'Operation not allowed') {
        super(message);
    }
}

export class ConflictError extends DomainError {
    readonly kind = 'conflict';
    constructor(message: string) {
        super(message);
    }
}

export class ValidationError extends DomainError {
    readonly kind = 'validation';
    constructor(message: string) {
        super(message);
    }
}
