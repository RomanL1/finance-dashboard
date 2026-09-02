import type { Id } from '../../../shared/kernel/index.js';

export interface CreateOrUpdateCategory {
    id: Id;
    name: string;
}

export interface Category {
    id: Id;
    name: string;
    createdAt: Date;
}
