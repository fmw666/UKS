// @ts-check
'use strict';

/**
 * Re-exports of core types and base classes for external consumers.
 *
 * Prefer importing directly from '@uks/core' (index.js) instead of this file.
 * This file exists for backward compatibility only.
 *
 * @module @uks/core/types
 */

const { StorageDriver } = require('./drivers');
const { PluginManager, Plugin, IngestPlugin } = require('./src/plugin-manager');
const { UksError, ValidationError, LockError, StorageError, NotFoundError, PluginError } = require('./src/errors');

module.exports = {
    // Storage
    StorageDriver,

    // Plugin System
    Plugin,
    IngestPlugin,
    PluginManager,

    // Error Hierarchy
    UksError,
    ValidationError,
    LockError,
    StorageError,
    NotFoundError,
    PluginError
};
