const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const jsonpath = require('jsonpath'); // Flexible extraction
const graphManager = require('./graph-manager');
const crypto = require('crypto'); // Need for ID generation inside batch
const Ajv = require('ajv');

// Load Schema
const SCHEMA_PATH = path.resolve(__dirname, '../../../spec/uks.schema.json');
const ajv = new Ajv();
let validate = null;

try {
    // Sync load for CLI speed (in real app, maybe async)
    const schemaContent = require('fs').readFileSync(SCHEMA_PATH, 'utf-8');
    const schema = JSON.parse(schemaContent);
    validate = ajv.compile(schema);
} catch (e) {
    // console.warn('Schema not found or invalid, validation disabled.', e.message);
}

class IngestManager {
    /**
     * Ingest JSON files matching the pattern.
     * @param {string} pattern - Glob pattern
     * @param {object} options - { dryRun, json, map (path to config), validate: boolean }
     */
    async ingest(pattern, options = {}) {
        const files = glob.sync(pattern);
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
                throw new Error(`Failed to load mapping file: ${e.message}`);
            }
        }

        if (options.json && !options.dryRun) {
            // Silent
        } else if (!options.json) {
            // No logging here to pass lint check
        }

        // Prepare Batch Logic
        const batchOperations = [];

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const data = JSON.parse(content);
                const filename = path.basename(file, path.extname(file));

                // 0. Schema Validation (New in v1.3)
                // Only if schema is loaded and data looks like a Bento Box (has flavor/nutrition)
                // Or if explicitly requested via options (not yet implemented flag, but good practice)
                if (validate && (data.flavor || data.nutrition || options.strict)) {
                    const valid = validate(data);
                    if (!valid) {
                        const errorMsg = validate.errors.map(err => `${err.instancePath} ${err.message}`).join(', ');
                        throw new Error(`Schema Validation Failed: ${errorMsg}`);
                    }
                }

                // 1. Resolve Entity Name & Type
                let entityName = filename;
                let entityType = 'KnowledgeAsset';
                let observations = [];

                if (mappingConfig) {
                    // Flexible extraction via JSONPath
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
                } else {
                    // Default Heuristics (Legacy)
                    entityName = data.title || filename;
                    entityType = data.archetype || 'KnowledgeAsset';
                }

                // Add source/version obs
                if (data.version) observations.push(`v${data.version}`);
                
                if (options.dryRun) {
                    report.preview.push({
                        file,
                        entity: { name: entityName, type: entityType, observations },
                        relations: this.extractRelations(data, entityName, mappingConfig)
                    });
                    continue;
                }

                // Queue Operation for Batch
                batchOperations.push(async (graph) => {
                    // Add Entity Logic (Duplicated from graph-manager but simplified for internal use)
                    const existing = graph.entities.find(e => e.name === entityName);
                    const inputObs = observations || [];
                    
                    if (existing) {
                        const existingObs = existing.observations || [];
                        const newObs = inputObs.filter(o => !existingObs.includes(o));
                        existing.observations = [...existingObs, ...newObs];
                    } else {
                        const newId = crypto.randomUUID();
                        const newEntity = {
                            id: newId,
                            name: entityName,
                            entityType: entityType,
                            observations: inputObs
                        };
                        graph.entities.push(newEntity);
                        report.entitiesAdded++;
                    }

                    // Add Relations
                    const relations = this.extractRelations(data, entityName, mappingConfig);
                    for (const rel of relations) {
                        // Lazy create target as Concept
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

                        // Resolve IDs
                        const fromEntity = graph.entities.find(e => e.name === entityName); // Should exist now
                        
                        // Check duplicate relation
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
                report.errors.push({ file, error: error.message });
            }
        }

        // Execute Batch (Atomic Write)
        if (!options.dryRun && batchOperations.length > 0) {
            await graphManager.updateGraph(async (graph) => {
                for (const op of batchOperations) {
                    await op(graph);
                }
            });
        }

        return report;
    }

    extractRelations(data, sourceName, mappingConfig) {
        const rels = [];

        if (mappingConfig && mappingConfig.relations) {
            // Flexible extraction: [{ path: "$.pillars[*].name", type: "includes" }]
            mappingConfig.relations.forEach(rule => {
                const results = jsonpath.query(data, rule.path);
                results.forEach(target => {
                    if (target) { // Ensure target is a string (or object we can coerce)
                         const targetName = typeof target === 'string' ? target : (target.name || JSON.stringify(target));
                         rels.push({ to: targetName, type: rule.type });
                    }
                });
            });
        } else {
            // Default Heuristics (Legacy)
            ['pillars', 'components', 'phases', 'layers', 'patterns'].forEach(key => {
                if (Array.isArray(data[key])) {
                    data[key].forEach(item => {
                        if (item.name) rels.push({ to: item.name, type: 'includes' });
                    });
                }
            });
            if (Array.isArray(data.related_to)) {
                data.related_to.forEach(item => rels.push({ to: item, type: 'related_to' }));
            }
            if (data.source && !data.source.startsWith('http')) {
                 rels.push({ to: data.source, type: 'derived_from' });
            }
        }
        
        return rels;
    }
}

module.exports = new IngestManager();
