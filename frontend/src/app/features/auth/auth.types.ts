export interface LoginCredentials {
    email: string;
    password: string;
}

export interface SignUpData {
    name: string;
    email: string;
    password: string;
}

/** Mirrors minPasswordLength / maxPasswordLength in the backend's auth.ts. */
export const PASSWORD_LENGTH = { min: 8, max: 128 } as const;

export interface DemoUser {
    /** Translation key of the button label. */
    labelKey: string;
    email: string;
    password: string;
}
