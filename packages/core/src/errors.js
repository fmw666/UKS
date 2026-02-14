// @ts-check
'use strict';

/**
 * Base error class for all UKS errors.
 * Provides structured error information with error codes.
 * @extends Error
 */
class UksError extends Error {
    /**
     * @param {string} message - Human-readable error message
     * @param {string} code - Machine-readable error code
     * @param {Record<string, unknown>} [details] - Additional error context
     */
    constructor(message, code, details) {
        super(message);
        this.name = 'UksError';
        this.code = code;
        this.details = details || {};
        // Capture proper stack trace (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /** @returns {Record<string, unknown>} JSON-serializable error representation */
    toJSON() {
        return {
            error: this.name,
            code: this.code,
            message: this.message,
            details: this.details
        };
    }
}

/**
 * Thrown when input validation fails (bad arguments, schema mismatch, etc.).
 * @extends UksError
 */
class ValidationError extends UksError {
    /**
     * @param {string} message
     * @param {Record<string, unknown>} [details]
     */
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

/**
 * Thrown when a file lock cannot be acquired or is in a bad state.
 * @extends UksError
 */
class LockError extends UksError {
    /**
     * @param {string} message
     * @param {Record<string, unknown>} [details]
     */
    constructor(message, details) {
        super(message, 'LOCK_ERROR', details);
        this.name = 'LockError';
    }
}

/**
 * Thrown when a storage I/O operation fails (read/write/delete).
 * @extends UksError
 */
class StorageError extends UksError {
    /**
     * @param {string} message
     * @param {Record<string, unknown>} [details]
     */
    constructor(message, details) {
        super(message, 'STORAGE_ERROR', details);
        this.name = 'StorageError';
    }
}

/**
 * Thrown when a requested entity, relation, or resource is not found.
 * @extends UksError
 */
class NotFoundError extends UksError {
    /**
     * @param {string} message
     * @param {Record<string, unknown>} [details]
     */
    constructor(message, details) {
        super(message, 'NOT_FOUND', details);
        this.name = 'NotFoundError';
    }
}

/**
 * Thrown when a plugin fails to load, register, or execute.
 * @extends UksError
 */
class PluginError extends UksError {
    /**
     * @param {string} message
     * @param {Record<string, unknown>} [details]
     */
    constructor(message, details) {
        super(message, 'PLUGIN_ERROR', details);
        this.name = 'PluginError';
    }
}

module.exports = {
    UksError,
    ValidationError,
    LockError,
    StorageError,
    NotFoundError,
    PluginError
};
