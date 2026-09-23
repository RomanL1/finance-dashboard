import { vi } from 'vitest';

/**
 * Node's own `localStorage` global shadows jsdom's and is unusable without `--localstorage-file`,
 * so specs that touch storage get a fresh in-memory one. Undo with `vi.unstubAllGlobals()`.
 */
export function stubLocalStorage(): Storage {
    const items = new Map<string, string>();
    const storage: Storage = {
        get length() {
            return items.size;
        },
        clear: () => items.clear(),
        getItem: (key) => items.get(key) ?? null,
        key: (index) => [...items.keys()][index] ?? null,
        removeItem: (key) => void items.delete(key),
        setItem: (key, value) => void items.set(key, String(value)),
    };
    vi.stubGlobal('localStorage', storage);
    return storage;
}
