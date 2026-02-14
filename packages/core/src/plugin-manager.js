class PluginManager {
    constructor() {
        this.plugins = [];
    }

    register(plugin) {
        this.plugins.push(plugin);
    }

    getIngestPlugins() {
        return this.plugins.filter(p => typeof p.ingest === 'function');
    }

    // Load plugins from directory (Placeholder for future dynamic loading)
    loadPlugins(dir) {
        // Implementation TODO
    }
}

// Export singleton for now
module.exports = new PluginManager();
