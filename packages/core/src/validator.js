// @ts-check
'use strict';

const path = require('path');
const { ValidationError } = require('./errors');

/**
 * Validates that a value is a non-empty string.
 * @param {unknown} value
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {string} The trimmed string
 * @throws {ValidationError}
 */
function requireString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ValidationError(
            `${fieldName} must be a non-empty string`,
            { field: fieldName, received: typeof value }
        );
    }
    return value.trim();
}

/**
 * Validates and sanitizes a string with length limit.
 * @param {unknown} value
 * @param {string} fieldName
 * @param {number} [maxLength=1000]
 * @returns {string}
 * @throws {ValidationError}
 */
function sanitizeString(value, fieldName, maxLength = 1000) {
    const str = requireString(value, fieldName);
    if (str.length > maxLength) {
        throw new ValidationError(
            `${fieldName} exceeds maximum length of ${maxLength}`,
            { field: fieldName, maxLength, actualLength: str.length }
        );
    }
    return str;
}

/**
 * Validates that a value is one of the allowed enum values.
 * @param {unknown} value
 * @param {string[]} allowed
 * @param {string} fieldName
 * @returns {string}
 * @throws {ValidationError}
 */
function requireEnum(value, allowed, fieldName) {
    const str = requireString(value, fieldName);
    if (!allowed.includes(str)) {
        throw new ValidationError(
            `${fieldName} must be one of: ${allowed.join(', ')}`,
            { field: fieldName, allowed, received: str }
        );
    }
    return str;
}

/**
 * Validates that observations is an array of strings.
 * @param {unknown} value
 * @returns {string[]}
 * @throws {ValidationError}
 */
function validateObservations(value) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
        throw new ValidationError(
            'observations must be an array',
            { received: typeof value }
        );
    }
    return value.map((item, i) => {
        if (typeof item !== 'string') {
            throw new ValidationError(
                `observations[${i}] must be a string`,
                { index: i, received: typeof item }
            );
        }
        return item;
    });
}

/**
 * Validates that a file path does not escape the allowed base directory.
 * Prevents path traversal attacks (e.g., ../../etc/passwd).
 * @param {string} filePath - The path to validate
 * @param {string} basePath - The allowed base directory
 * @returns {string} The resolved safe path
 * @throws {ValidationError}
 */
function validateSafePath(filePath, basePath) {
    const resolved = path.resolve(basePath, filePath);
    const resolvedBase = path.resolve(basePath);
    if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
        throw new ValidationError(
            'Path traversal detected: path escapes allowed directory',
            { path: filePath, base: basePath }
        );
    }
    return resolved;
}

/**
 * Validates a graph context name (alphanumeric + hyphens only).
 * @param {string} context
 * @returns {string}
 * @throws {ValidationError}
 */
function validateContext(context) {
    if (typeof context !== 'string') return 'default';
    const cleaned = context.replace(/[^a-zA-Z0-9-_]/g, '');
    if (cleaned !== context) {
        throw new ValidationError(
            'Context name must be alphanumeric (hyphens and underscores allowed)',
            { received: context }
        );
    }
    return cleaned || 'default';
}

module.exports = {
    requireString,
    sanitizeString,
    requireEnum,
    validateObservations,
    validateSafePath,
    validateContext
};
