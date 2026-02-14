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
        // Simplified loader: Look for directories starting with pattern
        // In a real scenario, we'd use require.resolve paths or scan node_modules
        // For local development, we might scan a 'plugins' folder
        
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
    PluginManager: new PluginManager()
};
