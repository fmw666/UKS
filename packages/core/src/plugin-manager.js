// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const { PluginError } = require('./errors');

/**
 * Base class for all UKS plugins.
 * Extend this to create custom plugins.
 */
class Plugin {
    /** @param {Record<string, unknown>} [config] */
    constructor(config = {}) {
        /** @type {Record<string, unknown>} */
        this.config = config;
    }

    /** @returns {string} Plugin name (defaults to class name) */
    get name() {
        return this.constructor.name || 'Plugin';
    }

    /** Optional async initialization hook. */
    async init() {
        // Override in subclass if needed
    }
}

/**
 * Base class for ingestion plugins.
 * Must implement `canHandle()` and `ingest()`.
 * @extends Plugin
 */
class IngestPlugin extends Plugin {
    /**
     * Whether this plugin can handle the given file.
     * @param {string} _filePath
     * @returns {boolean}
     */
    canHandle(_filePath) {
        return false;
    }

    /**
     * Ingest a file and return entities/relations.
     * @param {string} _filePath
     * @param {string} _content
     * @returns {Promise<object|null>}
     */
    async ingest(_filePath, _content) {
        throw new PluginError('IngestPlugin must implement ingest(filePath, content)');
    }
}

/**
 * Manages plugin registration, loading, and querying.
 */
class PluginManager {
    constructor() {
        /** @type {Plugin[]} */
        this.plugins = [];
    }

    /**
     * Register a plugin instance.
     * @param {Plugin} plugin
     */
    register(plugin) {
        if (!plugin || typeof plugin !== 'object') {
            throw new PluginError('Invalid plugin: must be a non-null object');
        }
        this.plugins.push(plugin);
        if (typeof plugin.init === 'function') {
            // Fire-and-forget init; errors are logged but non-fatal
            Promise.resolve(plugin.init()).catch(err => {
                console.warn(`[PluginManager] Plugin "${plugin.name}" init failed:`, err.message);
            });
        }
    }

    /**
     * Get all registered plugins that support ingestion.
     * @returns {IngestPlugin[]}
     */
    getIngestPlugins() {
        return /** @type {IngestPlugin[]} */ (
            this.plugins.filter(p => typeof /** @type {any} */ (p).ingest === 'function')
        );
    }

    /**
     * Auto-discover and load plugins from a directory.
     * @param {string} dir - Directory to scan
     * @param {RegExp} [pattern=/^uks-plugin-/] - Filename pattern to match
     */
    loadPlugins(dir, pattern = /^uks-plugin-/) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (!pattern.test(item)) continue;
            try {
                const pluginPath = path.join(dir, item);
                const PluginClass = require(pluginPath);
                const instance = new PluginClass();
                this.register(instance);
            } catch (e) {
                console.warn(`[PluginManager] Failed to load plugin "${item}":`, e.message);
            }
        }
    }
}

module.exports = { PluginManager, Plugin, IngestPlugin };
