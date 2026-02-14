// @ts-check
'use strict';

const { KnowledgeGraphManager } = require('./src/graph-manager');
const { VectorManager } = require('./src/vector-manager');
const { IngestManager } = require('./src/ingest-manager');
const BackupManager = require('./src/backup-manager');
const { PluginManager, Plugin, IngestPlugin } = require('./src/plugin-manager');
const { UksConfig } = require('./src/config');
const { StorageDriver, FsDriver } = require('./drivers');
const errors = require('./src/errors');
const validator = require('./src/validator');

/**
 * @typedef {object} Container
 * @property {UksConfig} config
 * @property {KnowledgeGraphManager} graphManager
 * @property {VectorManager} vectorManager
 * @property {IngestManager} ingestManager
 * @property {PluginManager} pluginManager
 * @property {BackupManager} backupManager
 */

/**
 * Create a fully-wired set of UKS manager instances.
 *
 * This is the recommended way to bootstrap UKS in CLI, MCP, or any consumer.
 * All managers share the same config and storage path, with proper dependency injection.
 *
 * @param {object} [options]
 * @param {string} [options.storagePath] - Override storage path
 * @param {UksConfig} [options.config] - Provide a custom config instance
 * @returns {Container}
 *
 * @example
 * const { createContainer } = require('@uks/core');
 * const { graphManager, vectorManager } = createContainer();
 * await graphManager.addEntity({ name: 'Node.js', entityType: 'Tool' });
 */
function createContainer(options = {}) {
    const config = options.config || new UksConfig();
    const storagePath = options.storagePath || config.getStoragePath();

    const backupManager = new BackupManager(storagePath);
    const pluginManager = new PluginManager();
    const graphManager = new KnowledgeGraphManager({ basePath: storagePath, backupManager });
    const vectorManager = new VectorManager({ storagePath, graphManager });
    const ingestManager = new IngestManager({ graphManager, vectorManager, pluginManager });

    return { config, graphManager, vectorManager, ingestManager, pluginManager, backupManager };
}

module.exports = {
    // === Classes (for custom wiring / testing) ===
    KnowledgeGraphManager,
    VectorManager,
    IngestManager,
    BackupManager,
    PluginManager,
    Plugin,
    IngestPlugin,
    UksConfig,

    // === Storage Drivers ===
    StorageDriver,
    FsDriver,

    // === Error Classes ===
    ...errors,

    // === Validator Utilities ===
    validator,

    // === DI Container Factory ===
    createContainer
};
