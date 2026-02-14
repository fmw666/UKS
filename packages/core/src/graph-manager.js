// @ts-check
'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const BackupManager = require('./backup-manager');
const { LockError, StorageError, NotFoundError } = require('./errors');
const { requireString, sanitizeString, validateObservations, validateContext } = require('./validator');

/**
 * @typedef {object} Entity
 * @property {string} id
 * @property {string} name
 * @property {string} entityType
 * @property {string[]} observations
 */

/**
 * @typedef {object} Relation
 * @property {string} fromId
 * @property {string} toId
 * @property {string} fromName
 * @property {string} toName
 * @property {string} relationType
 */

/**
 * @typedef {object} Graph
 * @property {Entity[]} entities
 * @property {Relation[]} relations
 */

/**
 * @typedef {object} GraphManagerOptions
 * @property {string} [basePath] - Directory for storing graph files
 * @property {BackupManager} [backupManager] - Injected backup manager
 * @property {{getStoragePath: () => string}} [config] - Injected config
 * @property {{type: string, source: string, version: string}} [fileMarker]
 * @property {number} [lockTimeoutMs] - Max age of a lock before forced release (default: 5000)
 * @property {number} [lockRetries] - Number of lock acquisition attempts (default: 3)
 */

/**
 * Core Knowledge Graph Manager.
 * Handles CRUD operations, atomic batch updates, and undo via backup.
 *
 * NOTE: No singleton — always create via `new` or use `createContainer()`.
 */
class KnowledgeGraphManager {
    /**
     * @param {GraphManagerOptions} [options]
     */
    constructor(options = {}) {
        const basePath = options.basePath
            || (options.config && options.config.getStoragePath())
            || process.env.UKS_STORAGE_PATH
            || path.resolve(process.cwd(), './knowledge/uks_graph');

        /** @type {string} */
        this.baseMemoryPath = basePath;
        /** @type {{type: string, source: string, version: string}} */
        this.fileMarker = options.fileMarker || { type: '_aim', source: 'local-knowledge-graph', version: '1.1.0' };
        /** @type {string} */
        this.lockFile = path.join(this.baseMemoryPath, '.lock');
        /** @type {number} */
        this.lockTimeoutMs = options.lockTimeoutMs || 5000;
        /** @type {number} */
        this.lockRetries = options.lockRetries || 3;
        /** @type {BackupManager} */
        this.backupMgr = options.backupManager || new BackupManager(this.baseMemoryPath);

        if (!fsSync.existsSync(this.baseMemoryPath)) {
            fsSync.mkdirSync(this.baseMemoryPath, { recursive: true });
        }
        this.backupMgr.ensureDir();
    }

    /**
     * Get the JSONL file path for a given context.
     * @param {string} [context='default']
     * @returns {string}
     */
    getFilePath(context = 'default') {
        return path.join(this.baseMemoryPath, `graph-${context}.jsonl`);
    }

    /**
     * Acquire an exclusive file lock with stale-PID detection.
     *
     * If the lock file exists, we check whether the holding process is still alive.
     * Dead processes' locks are cleaned up automatically.
     * Live processes' locks are respected, unless the lock is older than `lockTimeoutMs`.
     *
     * @param {number} [retries] - Override default retry count
     * @returns {Promise<boolean>} True if lock was acquired
     */
    async acquireLock(retries) {
        const maxRetries = retries ?? this.lockRetries;
        for (let i = 0; i < maxRetries; i++) {
            try {
                await fs.writeFile(this.lockFile, String(process.pid), { flag: 'wx' });
                return true;
            } catch (e) {
                if (/** @type {NodeJS.ErrnoException} */ (e).code === 'EEXIST') {
                    try {
                        const lockContent = await fs.readFile(this.lockFile, 'utf-8');
                        const lockPid = parseInt(lockContent.trim(), 10);

                        // Check if the lock-holding process is still alive
                        let processAlive = false;
                        if (!isNaN(lockPid)) {
                            try {
                                process.kill(lockPid, 0); // Signal 0 = existence check
                                processAlive = true;
                            } catch {
                                processAlive = false;
                            }
                        }

                        if (!processAlive) {
                            // Stale lock from a dead process — safe to remove
                            await fs.unlink(this.lockFile).catch(() => {});
                            continue;
                        }

                        // Lock held by a live process — check if it's timed out
                        const stat = await fs.stat(this.lockFile);
                        if (Date.now() - stat.mtimeMs > this.lockTimeoutMs) {
                            await fs.unlink(this.lockFile).catch(() => {});
                            continue;
                        }
                    } catch {
                        // Lock file disappeared between checks — retry immediately
                        continue;
                    }

                    await new Promise(r => setTimeout(r, 100));
                } else {
                    throw new LockError(`Failed to acquire lock: ${/** @type {Error} */ (e).message}`, { path: this.lockFile });
                }
            }
        }
        return false;
    }

    /**
     * Release the file lock, but only if we own it (PID check).
     * @returns {Promise<void>}
     */
    async releaseLock() {
        try {
            const content = await fs.readFile(this.lockFile, 'utf-8');
            if (content.trim() === String(process.pid)) {
                await fs.unlink(this.lockFile);
            }
        } catch {
            // Lock already released or doesn't exist — fine
        }
    }

    /**
     * Load the graph from disk.
     * @param {string} [context='default']
     * @returns {Promise<Graph>}
     */
    async loadGraph(context = 'default') {
        const ctx = validateContext(context);
        const filePath = this.getFilePath(ctx);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const lines = data.split('\n').filter(line => line.trim() !== '');

            if (lines.length === 0) return { entities: [], relations: [] };

            // Version check (first line is header)
            try {
                const header = JSON.parse(lines[0]);
                if (header.version === '1.0.0') {
                    console.warn('[UKS] Upgrading graph from v1.0.0 to v1.1.0 (Adding UUIDs)...');
                }
            } catch {
                // Not a valid header — continue
            }

            return lines.reduce((graph, line) => {
                try {
                    const item = JSON.parse(line);
                    if (item.type === 'entity') {
                        if (!item.id) {
                            item.id = crypto.createHash('md5').update(item.name).digest('hex');
                        }
                        graph.entities.push(item);
                    }
                    if (item.type === 'relation') {
                        graph.relations.push(item);
                    }
                } catch {
                    // Skip malformed lines
                }
                return graph;
            }, { entities: [], relations: [] });
        } catch (error) {
            if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
                return { entities: [], relations: [] };
            }
            throw new StorageError(
                `Failed to load graph: ${/** @type {Error} */ (error).message}`,
                { context: ctx, path: filePath }
            );
        }
    }

    /**
     * Execute a batch update on the graph atomically.
     * Acquires a lock, loads the graph, runs the updater, creates a backup, and saves.
     *
     * @param {(graph: Graph) => void | Promise<void>} updaterFn
     * @param {string} [context='default']
     * @returns {Promise<void>}
     */
    async updateGraph(updaterFn, context = 'default') {
        const ctx = validateContext(context);
        if (!await this.acquireLock()) {
            throw new LockError('Failed to acquire lock: Graph is busy.', { context: ctx });
        }

        try {
            const graph = await this.loadGraph(ctx);
            await updaterFn(graph);

            // Backup before overwriting
            await this.backupMgr.createSnapshot(ctx);

            const filePath = this.getFilePath(ctx);
            const lines = [
                JSON.stringify(this.fileMarker),
                ...graph.entities.map(e => JSON.stringify({ ...e, type: 'entity' })),
                ...graph.relations.map(r => JSON.stringify({ ...r, type: 'relation' }))
            ];
            await fs.writeFile(filePath, lines.join('\n'));
        } finally {
            await this.releaseLock();
        }
    }

    /**
     * Undo the last graph change by restoring from backup.
     * @param {string} [context='default']
     * @returns {Promise<string|null>}
     */
    async undo(context = 'default') {
        const ctx = validateContext(context);
        if (!await this.acquireLock()) {
            throw new LockError('Failed to acquire lock: Graph is busy.', { context: ctx });
        }
        try {
            return await this.backupMgr.restoreLatest(ctx);
        } finally {
            await this.releaseLock();
        }
    }

    /**
     * Add or merge an entity into the graph.
     *
     * If an entity with the same name exists, observations are merged.
     * Otherwise a new entity with a URN ID is created.
     *
     * @param {object} entity
     * @param {string} entity.name
     * @param {string} [entity.entityType='Concept']
     * @param {string[]} [entity.observations]
     * @param {string} [context='default']
     * @returns {Promise<string>} The entity's ID
     */
    async addEntity(entity, context = 'default') {
        sanitizeString(entity.name, 'entity.name', 500);
        const observations = validateObservations(entity.observations);

        let entityId;
        await this.updateGraph((graph) => {
            const existing = graph.entities.find(e => e.name === entity.name);

            if (existing) {
                const existingObs = existing.observations || [];
                const newObs = observations.filter(o => !existingObs.includes(o));
                existing.observations = [...existingObs, ...newObs];
                entityId = existing.id;
            } else {
                const flavor = (entity.entityType || 'Concept').toLowerCase();
                const cleanFlavor = flavor.replace(/[^a-z0-9-]/g, '');
                const uuid = crypto.randomUUID();
                const newId = `urn:uks:local:${cleanFlavor}:${uuid}`;

                graph.entities.push({
                    id: newId,
                    name: entity.name,
                    entityType: entity.entityType || 'Concept',
                    observations
                });
                entityId = newId;
            }
        }, context);
        return /** @type {string} */ (entityId);
    }

    /**
     * Add a directional relation between two entities.
     *
     * @param {object} relation
     * @param {string} relation.from - Source entity name or ID
     * @param {string} relation.to - Target entity name or ID
     * @param {string} relation.relationType - Type of the relation (e.g., 'depends_on')
     * @param {string} [context='default']
     * @returns {Promise<boolean>}
     */
    async addRelation(relation, context = 'default') {
        sanitizeString(relation.from, 'relation.from', 500);
        sanitizeString(relation.to, 'relation.to', 500);
        requireString(relation.relationType, 'relation.relationType');

        await this.updateGraph((graph) => {
            const fromEntity = graph.entities.find(e => e.name === relation.from || e.id === relation.from);
            const toEntity = graph.entities.find(e => e.name === relation.to || e.id === relation.to);

            if (!fromEntity || !toEntity) {
                throw new NotFoundError(
                    `Cannot link: Entity not found ('${relation.from}' or '${relation.to}')`,
                    { from: relation.from, to: relation.to }
                );
            }

            const exists = graph.relations.some(r =>
                r.fromId === fromEntity.id &&
                r.toId === toEntity.id &&
                r.relationType === relation.relationType
            );

            if (!exists) {
                graph.relations.push({
                    fromId: fromEntity.id,
                    toId: toEntity.id,
                    fromName: fromEntity.name,
                    toName: toEntity.name,
                    relationType: relation.relationType
                });
            }
        }, context);
        return true;
    }

    /**
     * Search the graph by keyword match.
     *
     * NOTE: Semantic (vector) search is handled by VectorManager.
     * This method performs keyword-only search.
     *
     * @param {string} query
     * @param {object} [options]
     * @param {string} [context='default']
     * @returns {Promise<{entities: Entity[], relations: Relation[], metadata: object}>}
     */
    async search(query, options = {}, context = 'default') {
        requireString(query, 'query');
        const graph = await this.loadGraph(context);

        const q = query.toLowerCase();
        const entities = graph.entities.filter(e =>
            e.name.toLowerCase().includes(q) ||
            (e.observations || []).some(o => o.toLowerCase().includes(q))
        );

        const ids = new Set(entities.map(e => e.id));
        const relations = graph.relations.filter(r => ids.has(r.fromId) || ids.has(r.toId));

        return { entities, relations, metadata: { mode: 'keyword' } };
    }

    /**
     * Get all entities and relations from the graph.
     * @param {string} [context='default']
     * @returns {Promise<Graph>}
     */
    async getAll(context = 'default') {
        return await this.loadGraph(context);
    }
}

module.exports = { KnowledgeGraphManager };
