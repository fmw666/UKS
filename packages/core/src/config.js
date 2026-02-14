// @ts-check
'use strict';

const Conf = require('conf');

const CONF_SCHEMA = {
    storagePath: {
        type: 'string',
        default: process.env.UKS_STORAGE_PATH || './knowledge/uks_graph'
    }
};

/**
 * UKS Configuration Manager.
 * Wraps the third-party `conf` library behind a clean, testable interface.
 * No monkey-patching — all methods are proper class members.
 */
class UksConfig {
    /**
     * @param {object} [options]
     * @param {string} [options.projectName] - Name for the config store (default: 'uks-cli')
     * @param {Record<string, unknown>} [options.overrides] - In-memory overrides (useful for testing)
     */
    constructor(options = {}) {
        /** @private */
        this._conf = new Conf({
            projectName: options.projectName || 'uks-cli',
            schema: CONF_SCHEMA
        });
        /** @private */
        this._overrides = options.overrides || {};
    }

    /**
     * Get the storage path. Priority: env var > overrides > persisted config.
     * @returns {string}
     */
    getStoragePath() {
        if (this._overrides.storagePath) return /** @type {string} */ (this._overrides.storagePath);
        return process.env.UKS_STORAGE_PATH || this._conf.get('storagePath');
    }

    /**
     * Set a configuration value (persisted to disk).
     * @param {string} key
     * @param {unknown} value
     */
    set(key, value) {
        this._conf.set(key, value);
    }

    /**
     * Get a configuration value.
     * @param {string} key
     * @returns {unknown}
     */
    get(key) {
        if (key in this._overrides) return this._overrides[key];
        return this._conf.get(key);
    }
}

module.exports = { UksConfig };
