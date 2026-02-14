const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const jsonpath = require('jsonpath'); // Flexible extraction
const graphManager = require('./graph-manager');

class IngestManager {
    /**
     * Ingest JSON files matching the pattern.
     * @param {string} pattern - Glob pattern
     * @param {object} options - { dryRun, json, map (path to config) }
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
            console.log(`[UKS] Found ${files.length} files matching '${pattern}'...`);
        }

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const data = JSON.parse(content);
                const filename = path.basename(file, path.extname(file));

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

                // Live Run
                await graphManager.addEntity({
                    name: entityName,
                    entityType: entityType,
                    observations
                });
                report.entitiesAdded++;

                const relations = this.extractRelations(data, entityName, mappingConfig);
                for (const rel of relations) {
                    // Lazy create target as Concept
                    await graphManager.addEntity({ name: rel.to, entityType: 'Concept' });
                    
                    await graphManager.addRelation({
                        from: entityName,
                        to: rel.to,
                        relationType: rel.type
                    });
                    report.relationsAdded++;
                }

                report.processed++;

            } catch (error) {
                report.errors.push({ file, error: error.message });
            }
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
