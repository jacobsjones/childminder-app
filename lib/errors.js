// Error types shared by the data layer and API routes. Kept free of imports
// so scripts can load the data layer outside Next.js.

/** No signed-in user. API routes turn this into a 401. */
export class AuthError extends Error {
    constructor(message = 'Not signed in') {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * The record does not exist, or belongs to someone else. Both cases return
 * 404 so one user cannot learn which ids exist for another.
 */
export class NotFoundError extends Error {
    constructor(message = 'Not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

/** A usage limit was reached. API routes turn this into a 429. */
export class LimitError extends Error {
    constructor(message = 'Limit reached') {
        super(message);
        this.name = 'LimitError';
    }
}

/** The recipient address of an email is not usable. API routes turn this into a 409. */
export class InvalidRecipientError extends Error {
    constructor(message = 'Invalid recipient email address.') {
        super(message);
        this.name = 'InvalidRecipientError';
    }
}

/** The server is missing configuration it needs. Its message is safe to show the user. */
export class ConfigError extends Error {
    constructor(message = 'Server is not configured.') {
        super(message);
        this.name = 'ConfigError';
    }
}
