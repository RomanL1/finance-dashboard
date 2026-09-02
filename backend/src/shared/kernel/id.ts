import { randomUUID } from 'node:crypto';

/** All persisted entities use text ids so they line up with better-auth's user ids. */
export type Id = string;

export function newId(): Id {
    return randomUUID();
}
