const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Base Plugin Interface
 */
class Plugin {
    constructor(config = {}) {
        this.config = config;
    }

    get name() {
        throw new Error('Plugin must implement name getter');
    }

    get version() {
        return '0.0.1';
    }

    async init() {
        // Optional initialization
    }
}

/**
 * Ingest Plugin Interface - Transforms content to UKS Schema
 */
class IngestPlugin extends Plugin {
    /**
     * @param {string} filePath
     * @param {string} content
     * @returns {Promise<object>} Returns { entities: [], relations: [] } or standard schema JSON
     */
    async ingest(filePath, content) {
        throw new Error('IngestPlugin must implement ingest method');
    }

    /**
     * @param {string} filePath
     * @returns {boolean} True if this plugin can handle the file
     */
    canHandle(filePath) {
        return false;
    }
}

/**
 * Storage Abstraction Layer (SAL) - Driver Interface
 */
class StorageDriver {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Read file content
     * @param {string} path - Virtual path (e.g., 'vectors.jsonl')
     * @returns {Promise<string>} File content
     */
    async read(path) {
        throw new Error('StorageDriver must implement read(path)');
    }

    /**
     * Write content to file
     * @param {string} path - Virtual path
     * @param {string} content - Data to write
     * @returns {Promise<void>}
     */
    async write(path, content) {
        throw new Error('StorageDriver must implement write(path, content)');
    }

    /**
     * List files in a directory/prefix
     * @param {string} prefix - Optional prefix filter
     * @returns {Promise<string[]>} List of file paths
     */
    async list(prefix = '') {
        throw new Error('StorageDriver must implement list(prefix)');
    }

    /**
     * Check if file exists
     * @param {string} path 
     * @returns {Promise<boolean>}
     */
    async exists(path) {
        throw new Error('StorageDriver must implement exists(path)');
    }

    /**
     * Delete a file
     * @param {string} path 
     * @returns {Promise<void>}
     */
    async delete(path) {
        throw new Error('StorageDriver must implement delete(path)');
    }
}

class PluginManager {
    constructor() {
        this.plugins = [];
    }

    /**
     * Load plugins from a directory (e.g. node_modules) matching a pattern
     * @param {string} dir 
     * @param {string} pattern - e.g. 'uks-plugin-*'
     */
    loadPlugins(dir, pattern = 'uks-plugin-*') {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (item.match(pattern)) {
                try {
                    const pluginPath = path.join(dir, item);
                    const PluginClass = require(pluginPath);
                    const instance = new PluginClass();
                    this.register(instance);
                    console.log(`Loaded plugin: ${instance.name}`);
                } catch (e) {
                    console.error(`Failed to load plugin ${item}:`, e.message);
                }
            }
        }
    }

    register(plugin) {
        if (plugin instanceof Plugin) {
            this.plugins.push(plugin);
            plugin.init();
        }
    }

    getIngestPlugins() {
        return this.plugins.filter(p => p instanceof IngestPlugin);
    }
}

module.exports = {
    Plugin,
    IngestPlugin,
    StorageDriver,
    PluginManager: new PluginManager()
};
