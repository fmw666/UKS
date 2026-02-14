// @ts-check
'use strict';

const fs = require('fs').promises;
const path = require('path');
const { StorageError } = require('./src/errors');

/**
 * Abstract base class for storage drivers.
 * Extend this to implement custom storage backends (filesystem, S3, Git, etc.).
 */
class StorageDriver {
    /**
     * Read the content of a key.
     * @param {string} _key
     * @returns {Promise<string|null>}
     */
    async read(_key) { throw new StorageError('StorageDriver.read() not implemented'); }

    /**
     * Write content to a key.
     * @param {string} _key
     * @param {string} _value
     * @returns {Promise<void>}
     */
    async write(_key, _value) { throw new StorageError('StorageDriver.write() not implemented'); }

    /**
     * List all keys under a prefix.
     * @param {string} [_prefix]
     * @returns {Promise<string[]>}
     */
    async list(_prefix) { throw new StorageError('StorageDriver.list() not implemented'); }

    /**
     * Check if a key exists.
     * @param {string} _key
     * @returns {Promise<boolean>}
     */
    async exists(_key) { throw new StorageError('StorageDriver.exists() not implemented'); }

    /**
     * Delete a key.
     * @param {string} _key
     * @returns {Promise<void>}
     */
    async delete(_key) { throw new StorageError('StorageDriver.delete() not implemented'); }
}

/**
 * Filesystem-backed storage driver.
 * @extends StorageDriver
 */
class FsDriver extends StorageDriver {
    /** @param {string} basePath */
    constructor(basePath) {
        super();
        if (!basePath || typeof basePath !== 'string') {
            throw new StorageError('FsDriver requires a valid basePath');
        }
        /** @type {string} */
        this.basePath = basePath;
    }

    /** @param {string} key @returns {Promise<string|null>} */
    async read(key) {
        const filePath = path.join(this.basePath, key);
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (e) {
            if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') return null;
            throw new StorageError(`Failed to read "${key}": ${/** @type {Error} */ (e).message}`);
        }
    }

    /** @param {string} key @param {string} value @returns {Promise<void>} */
    async write(key, value) {
        const filePath = path.join(this.basePath, key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, value);
    }

    /** @param {string} [prefix] @returns {Promise<string[]>} */
    async list(prefix = '') {
        try {
            const files = await fs.readdir(this.basePath, { recursive: true });
            return /** @type {string[]} */ (files).filter(f => !f.startsWith('.'));
        } catch (e) {
            if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') return [];
            throw new StorageError(`Failed to list "${prefix}": ${/** @type {Error} */ (e).message}`);
        }
    }

    /** @param {string} key @returns {Promise<boolean>} */
    async exists(key) {
        const filePath = path.join(this.basePath, key);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /** @param {string} key @returns {Promise<void>} */
    async delete(key) {
        const filePath = path.join(this.basePath, key);
        try {
            await fs.unlink(filePath);
        } catch (e) {
            if (/** @type {NodeJS.ErrnoException} */ (e).code !== 'ENOENT') {
                throw new StorageError(`Failed to delete "${key}": ${/** @type {Error} */ (e).message}`);
            }
        }
    }
}

/**
 * Git-backed storage driver (stub for future implementation).
 * @extends FsDriver
 */
class GitDriver extends FsDriver {
    /** @param {string} basePath */
    constructor(basePath) {
        super(basePath);
    }
    // TODO: Add git commit-on-write, branch support, etc.
}

module.exports = { StorageDriver, FsDriver, GitDriver };
