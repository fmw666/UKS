// @ts-check
'use strict';

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const jsonpath = require('jsonpath');
const crypto = require('crypto');
const Ajv = require('ajv');
const { ValidationError, StorageError } = require('./errors');
const { requireString } = require('./validator');

const DEFAULT_SCHEMA_PATH = path.resolve(__dirname, '../schemas/uks.schema.json');

/**
 * @typedef {object} IngestReport
 * @property {number} totalFiles
 * @property {number} processed
 * @property {number} entitiesAdded
 * @property {number} relationsAdded
 * @property {Array<{file: string, error: string}>} errors
 * @property {object[]} preview
 */

/**
 * @typedef {object} IngestManagerOptions
 * @property {import('./graph-manager').KnowledgeGraphManager} graphManager
 * @property {import('./vector-manager').VectorManager} [vectorManager]
 * @property {import('./plugin-manager').PluginManager} [pluginManager]
 * @property {string} [schemaPath]
 */

/**
 * Manages ingestion of external JSON files into the knowledge graph.
 * Supports schema validation, JSONPath mapping, plugin-based handling, and vector integration.
 *
 * NOTE: No singleton — always create via `new` or use `createContainer()`.
 */
class IngestManager {
    /**
     * @param {IngestManagerOptions} options
     */
    constructor(options = {}) {
        if (!options.graphManager) {
            throw new ValidationError('IngestManager requires a graphManager dependency');
        }
        /** @type {import('./graph-manager').KnowledgeGraphManager} */
        this.graphManager = options.graphManager;
        /** @type {import('./vector-manager').VectorManager|null} */
        this.vectorManager = options.vectorManager || null;
        /** @type {import('./plugin-manager').PluginManager|null} */
        this.pluginManager = options.pluginManager || null;
        /** @type {string} */
        this.schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
        /** @private @type {Function|null} */
        this._validate = null;
        this._loadSchema();
    }

    /** @private */
    _loadSchema() {
        const ajv = new Ajv();
        try {
            const schemaContent = require('fs').readFileSync(this.schemaPath, 'utf-8');
            const schema = JSON.parse(schemaContent);
            this._validate = ajv.compile(schema);
        } catch {
            this._validate = null;
        }
    }

    /**
     * Ingest JSON files matching a glob pattern.
     *
     * @param {string} pattern - Glob pattern for file discovery
     * @param {object} [options]
     * @param {boolean} [options.dryRun] - Simulate without writing
     * @param {boolean} [options.json] - Output JSON format
     * @param {string} [options.map] - Path to mapping config (JSON)
     * @param {boolean} [options.strict] - Enforce schema validation for all files
     * @returns {Promise<IngestReport>}
     */
    async ingest(pattern, options = {}) {
        requireString(pattern, 'pattern');

        const files = glob.sync(pattern);
        /** @type {IngestReport} */
        const report = {
            totalFiles: files.length,
            processed: 0,
            entitiesAdded: 0,
            relationsAdded: 0,
            errors: [],
            preview: []
        };

        // Load Mapping Config (if provided)
        let mappingConfig = null;
        if (options.map) {
            try {
                const mapContent = await fs.readFile(options.map, 'utf-8');
                mappingConfig = JSON.parse(mapContent);
            } catch (e) {
                throw new ValidationError(`Failed to load mapping file: ${/** @type {Error} */ (e).message}`);
            }
        }

        // Prepare Batch Logic
        /** @type {Array<(graph: import('./graph-manager').Graph) => Promise<void>>} */
        const batchOperations = [];

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                let data = null;
                let isPluginHandled = false;

                // Plugin Check
                if (this.pluginManager) {
                    const plugins = this.pluginManager.getIngestPlugins();
                    for (const plugin of plugins) {
                        if (plugin.canHandle(file)) {
                            const result = await plugin.ingest(file, content);
                            if (result) {
                                data = result;
                                isPluginHandled = true;
                                break;
                            }
                        }
                    }
                }

                if (!isPluginHandled) {
                    if (path.extname(file) === '.json') {
                        data = JSON.parse(content);
                    } else {
                        continue; // Skip non-JSON without plugin
                    }
                }

                if (!data) continue;

                const filename = path.basename(file, path.extname(file));

                // Auto-fill URN if missing for Bento Box data
                if ((data.flavor || data.nutrition) && !data.id) {
                    const flavor = (data.flavor || 'Concept').toLowerCase();
                    const cleanFlavor = flavor.replace(/[^a-z0-9-]/g, '');
                    const hashSource = data.title || crypto.randomUUID();
                    const uuid = crypto.createHash('md5').update(hashSource).digest('hex');
                    data.id = `urn:uks:local:${cleanFlavor}:${uuid}`;
                }

                // Schema Validation
                if (this._validate && (data.flavor || data.nutrition || options.strict)) {
                    const valid = this._validate(data);
                    if (!valid) {
                        const errorMsg = this._validate.errors
                            .map(/** @param {object} err */ err => `${err.instancePath} ${err.message}`)
                            .join(', ');
                        throw new ValidationError(`Schema Validation Failed: ${errorMsg}`);
                    }
                }

                // Resolve Entity Name & Type
                let entityName = data.dish || data.title || filename;
                let entityType = data.flavor || data.archetype || 'KnowledgeAsset';
                let observations = [];

                if (mappingConfig) {
                    if (mappingConfig.entityName) {
                        const res = jsonpath.query(data, mappingConfig.entityName);
                        if (res.length > 0) entityName = res[0];
                    }
                    if (mappingConfig.entityType) {
                        const res = jsonpath.query(data, mappingConfig.entityType);
                        if (res.length > 0) entityType = res[0];
                    } else if (mappingConfig.defaultType) {
                        entityType = mappingConfig.defaultType;
                    }
                }

                if (data.version) observations.push(`v${data.version}`);
                if (Array.isArray(data.observations)) {
                    observations.push(...data.observations);
                }

                if (options.dryRun) {
                    report.preview.push({
                        file,
                        entity: { name: entityName, type: entityType, observations },
                        relations: this.extractRelations(data, entityName, mappingConfig)
                    });
                    continue;
                }

                // Capture variables for closure
                const capturedEntityName = entityName;
                const capturedEntityType = entityType;
                const capturedObservations = observations;
                const capturedData = data;

                batchOperations.push(async (graph) => {
                    const existing = graph.entities.find(e => e.name === capturedEntityName);

                    if (existing) {
                        const existingObs = existing.observations || [];
                        const newObs = capturedObservations.filter(o => !existingObs.includes(o));
                        existing.observations = [...existingObs, ...newObs];
                    } else {
                        let newId = capturedData.id;
                        if (!newId) {
                            const flavor = (capturedEntityType || 'Concept').toLowerCase();
                            const cleanFlavor = flavor.replace(/[^a-z0-9-]/g, '');
                            const uuid = crypto.randomUUID();
                            newId = `urn:uks:local:${cleanFlavor}:${uuid}`;
                        }

                        const newEntity = {
                            id: newId,
                            name: capturedEntityName,
                            entityType: capturedEntityType,
                            observations: capturedObservations
                        };

                        // Vector Integration
                        if (this.vectorManager) {
                            const textContent = capturedData.description
                                || (capturedData.nutrition ? JSON.stringify(capturedData.nutrition) : '')
                                || capturedEntityName;
                            if (textContent) {
                                await this.vectorManager.upsert(newId, textContent);
                            }
                        }

                        graph.entities.push(newEntity);
                        report.entitiesAdded++;
                    }

                    // Add Relations
                    const relations = this.extractRelations(capturedData, capturedEntityName, mappingConfig);
                    for (const rel of relations) {
                        let targetEntity = graph.entities.find(e => e.name === rel.to);
                        if (!targetEntity) {
                            targetEntity = {
                                id: crypto.randomUUID(),
                                name: rel.to,
                                entityType: 'Concept',
                                observations: []
                            };
                            graph.entities.push(targetEntity);
                        }

                        const fromEntity = graph.entities.find(e => e.name === capturedEntityName);
                        if (!fromEntity) continue;

                        const exists = graph.relations.some(r =>
                            r.fromId === fromEntity.id &&
                            r.toId === targetEntity.id &&
                            r.relationType === rel.type
                        );

                        if (!exists) {
                            graph.relations.push({
                                fromId: fromEntity.id,
                                toId: targetEntity.id,
                                fromName: fromEntity.name,
                                toName: targetEntity.name,
                                relationType: rel.type
                            });
                            report.relationsAdded++;
                        }
                    }
                });

                report.processed++;
            } catch (error) {
                report.errors.push({ file, error: /** @type {Error} */ (error).message });
            }
        }

        // Execute Batch (Atomic Write)
        if (!options.dryRun && batchOperations.length > 0) {
            await this.graphManager.updateGraph(async (graph) => {
                for (const op of batchOperations) {
                    await op(graph);
                }
            });
        }

        return report;
    }

    /**
     * Extract relations from ingested data using heuristics or mapping config.
     *
     * @param {object} data - Parsed JSON data
     * @param {string} sourceName - Name of the source entity
     * @param {object|null} mappingConfig - Optional mapping config
     * @returns {Array<{to: string, type: string}>}
     */
    extractRelations(data, sourceName, mappingConfig) {
        const rels = [];

        if (mappingConfig && mappingConfig.relations) {
            mappingConfig.relations.forEach(/** @param {object} rule */ rule => {
                const results = jsonpath.query(data, rule.path);
                results.forEach(/** @param {unknown} target */ target => {
                    if (target) {
                        const targetName = typeof target === 'string'
                            ? target
                            : (/** @type {any} */ (target).name || JSON.stringify(target));
                        rels.push({ to: targetName, type: rule.type });
                    }
                });
            });
        } else {
            // Default heuristics
            ['pillars', 'components', 'phases', 'layers', 'patterns'].forEach(key => {
                if (Array.isArray(data[key])) {
                    data[key].forEach(/** @param {object} item */ item => {
                        if (item.name) rels.push({ to: item.name, type: 'includes' });
                    });
                }
            });
            if (Array.isArray(data.related_to)) {
                data.related_to.forEach(/** @param {string} item */ item => rels.push({ to: item, type: 'related_to' }));
            }
            if (data.source && typeof data.source === 'string' && !data.source.startsWith('http')) {
                rels.push({ to: data.source, type: 'derived_from' });
            }
        }

        return rels;
    }
}

module.exports = { IngestManager };
