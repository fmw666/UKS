const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');
const crypto = require('crypto'); // Native UUID
const { pipeline } = require('@xenova/transformers');

const config = require('./config');
const BackupManager = require('./backup-manager'); // New

// Configuration
const BASE_MEMORY_PATH = process.env.UKS_STORAGE_PATH || config.get('storagePath') || path.resolve(process.cwd(), '.northstar');
const FILE_MARKER = { type: '_aim', source: 'local-knowledge-graph', version: '1.1.0' }; // Bump version
const LOCK_FILE = path.join(BASE_MEMORY_PATH, '.lock');

// Ensure base path exists
if (!existsSync(BASE_MEMORY_PATH)) {
    require('fs').mkdirSync(BASE_MEMORY_PATH, { recursive: true });
}

// Ensure backup path exists
const backupMgr = new BackupManager(BASE_MEMORY_PATH);
backupMgr.ensureDir();

function getFilePath(context = 'default') {
    return path.join(BASE_MEMORY_PATH, `graph-${context}.jsonl`);
}

// Simple File Lock Implementation
async function acquireLock(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await fs.writeFile(LOCK_FILE, String(process.pid), { flag: 'wx' });
            return true;
        } catch (e) {
            if (e.code === 'EEXIST') {
                const stat = await fs.stat(LOCK_FILE);
                if (Date.now() - stat.mtimeMs > 5000) {
                    await fs.unlink(LOCK_FILE);
                    continue;
                }
                await new Promise(r => setTimeout(r, 100));
            } else {
                throw e;
            }
        }
    }
    return false;
}

async function releaseLock() {
    try {
        await fs.unlink(LOCK_FILE);
    } catch(e) { /* ignore */ }
}

class KnowledgeGraphManager {
    async loadGraph(context = 'default') {
        const filePath = getFilePath(context);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const lines = data.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length === 0) return { entities: [], relations: [] };

            // Version Check
            try {
                const header = JSON.parse(lines[0]);
                // v1.0.0 to v1.1.0 migration logic could go here
                if (header.version === '1.0.0') {
                    console.warn('[UKS] Upgrading graph from v1.0.0 to v1.1.0 (Adding UUIDs)...');
                    // We will handle migration in memory and save back later
                }
            } catch(e) {}

            return lines.reduce((graph, line) => {
                try {
                    const item = JSON.parse(line);
                    if (item.type === 'entity') {
                        // Migration: If no ID, generate one based on name hash (deterministic for stability)
                        if (!item.id) {
                            item.id = crypto.createHash('md5').update(item.name).digest('hex');
                        }
                        graph.entities.push(item);
                    }
                    if (item.type === 'relation') {
                        // Migration: If relations rely on names, we keep them for now, but v1.1 should prefer IDs
                        graph.relations.push(item);
                    }
                } catch (e) { /* ignore */ }
                return graph;
            }, { entities: [], relations: [] });
        } catch (error) {
            if (error.code === 'ENOENT') return { entities: [], relations: [] };
            throw error;
        }
    }

    // Batch Operation (Transaction-like)
    async updateGraph(updaterFn, context = 'default') {
        // Acquire lock for the whole batch
        if (!await acquireLock()) {
            throw new Error('Failed to acquire lock: Graph is busy.');
        }

        try {
            const graph = await this.loadGraph(context); // Load current state (internal method, bypassing lock)
            
            // Execute updater function which modifies the graph object directly
            // updaterFn(graph) -> void or Promise<void>
            await updaterFn(graph);

            // Save once (Backup happens here)
            // Backup before write! (Reversibility)
            await backupMgr.createSnapshot(context);

            const filePath = getFilePath(context);
            const lines = [
                JSON.stringify(FILE_MARKER),
                ...graph.entities.map(e => JSON.stringify({ ...e, type: 'entity' })),
                ...graph.relations.map(r => JSON.stringify({ ...r, type: 'relation' }))
            ];
            await fs.writeFile(filePath, lines.join('\n'));
        } finally {
            await releaseLock();
        }
    }

    // New: Undo
    async undo(context = 'default') {
        if (!await acquireLock()) {
            throw new Error('Failed to acquire lock: Graph is busy.');
        }
        try {
            const restoredFile = await backupMgr.restoreLatest(context);
            return restoredFile;
        } finally {
            await releaseLock();
        }
    }

    async addEntity(entity, context = 'default') {
        // Wrapper for single entity add using updateGraph
        let entityId;
        await this.updateGraph((graph) => {
            const existing = graph.entities.find(e => e.name === entity.name);
            const inputObs = entity.observations || [];
            
            if (existing) {
                const existingObs = existing.observations || [];
                const newObs = inputObs.filter(o => !existingObs.includes(o));
                existing.observations = [...existingObs, ...newObs];
                entityId = existing.id;
            } else {
                const newId = crypto.randomUUID();
                const newEntity = {
                    id: newId,
                    name: entity.name,
                    entityType: entity.entityType || 'concept',
                    observations: inputObs
                };
                graph.entities.push(newEntity);
                entityId = newId;
            }
        }, context);
        return entityId;
    }

    async addRelation(relation, context = 'default') {
        // Wrapper for single relation add using updateGraph
        await this.updateGraph((graph) => {
            // Resolve Names to IDs
            const fromEntity = graph.entities.find(e => e.name === relation.from || e.id === relation.from);
            const toEntity = graph.entities.find(e => e.name === relation.to || e.id === relation.to);
    
            if (!fromEntity || !toEntity) {
                throw new Error(`Cannot link: Entities not found ('${relation.from}' or '${relation.to}')`);
            }
    
            // Check duplicates (using IDs now)
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

    async search(query, options = {}, context = 'default') {
        const graph = await this.loadGraph(context);
        
        if (options.semantic) {
            console.error('Using semantic search (Prototype via @xenova/transformers)...');
            // Lazy load the pipeline
            const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            
            // Helper: Cosine Similarity
            const cosineSim = (a, b) => {
                let dotProduct = 0;
                let normA = 0;
                let normB = 0;
                for (let i = 0; i < a.length; i++) {
                    dotProduct += a[i] * b[i];
                    normA += a[i] * a[i];
                    normB += b[i] * b[i];
                }
                return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            };

            // 1. Embed Query
            const queryOutput = await pipe(query, { pooling: 'mean', normalize: true });
            const queryEmb = queryOutput.data;

            // 2. Embed & Score Entities (In-Memory for Prototype - slow for large graphs!)
            const scoredEntities = [];
            
            // Use Promise.all for parallel embedding if possible, but transformers.js is single-threaded in node mostly
            for (const entity of graph.entities) {
                // Combine name + observations into a single text blob
                const text = `${entity.name}. ${entity.observations.join('. ')}`;
                const entityOutput = await pipe(text, { pooling: 'mean', normalize: true });
                const entityEmb = entityOutput.data;
                
                const score = cosineSim(queryEmb, entityEmb);
                if (score > 0.25) { // Threshold
                    scoredEntities.push({ ...entity, score });
                }
            }

            // Sort by score desc
            scoredEntities.sort((a, b) => b.score - a.score);
            
            const entities = scoredEntities.slice(0, 5); // Top 5
            const ids = new Set(entities.map(e => e.id));
            const relations = graph.relations.filter(r => ids.has(r.fromId) || ids.has(r.toId));
            
            return { entities, relations, metadata: { mode: 'semantic', model: 'all-MiniLM-L6-v2' } };

        } else {
            // Traditional Keyword Search
            const q = query.toLowerCase();
            const entities = graph.entities.filter(e => 
                e.name.toLowerCase().includes(q) || 
                e.observations.some(o => o.toLowerCase().includes(q))
            );
            
            const ids = new Set(entities.map(e => e.id));
            const relations = graph.relations.filter(r => ids.has(r.fromId) || ids.has(r.toId));
            
            return { entities, relations, metadata: { mode: 'keyword' } };
        }
    }
    
    async getAll(context = 'default') {
        return await this.loadGraph(context);
    }
}

module.exports = new KnowledgeGraphManager();
