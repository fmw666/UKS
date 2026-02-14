const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

// Configuration
const BASE_MEMORY_PATH = path.resolve(__dirname, '../../../memory/knowledge_graph');
const FILE_MARKER = { type: "_aim", source: "local-knowledge-graph" };

// Ensure base path exists
if (!existsSync(BASE_MEMORY_PATH)) {
    require('fs').mkdirSync(BASE_MEMORY_PATH, { recursive: true });
}

function getFilePath(context = 'default') {
    return path.join(BASE_MEMORY_PATH, `graph-${context}.jsonl`);
}

class KnowledgeGraphManager {
    async loadGraph(context = 'default') {
        const filePath = getFilePath(context);
        try {
            const data = await fs.readFile(filePath, "utf-8");
            const lines = data.split("\n").filter(line => line.trim() !== "");
            
            if (lines.length === 0) return { entities: [], relations: [] };

            // Skip marker check for robustness if file is just pure data, but good to have
            // const firstLine = JSON.parse(lines[0]);
            
            return lines.reduce((graph, line) => {
                try {
                    const item = JSON.parse(line);
                    if (item.type === "entity") graph.entities.push(item);
                    if (item.type === "relation") graph.relations.push(item);
                } catch (e) { /* ignore corrupt lines */ }
                return graph;
            }, { entities: [], relations: [] });
        } catch (error) {
            if (error.code === "ENOENT") return { entities: [], relations: [] };
            throw error;
        }
    }

    async saveGraph(graph, context = 'default') {
        const filePath = getFilePath(context);
        const lines = [
            JSON.stringify(FILE_MARKER),
            ...graph.entities.map(e => JSON.stringify({ ...e, type: "entity" })),
            ...graph.relations.map(r => JSON.stringify({ ...r, type: "relation" }))
        ];
        await fs.writeFile(filePath, lines.join("\n"));
    }

    // --- Actions ---

    async addEntity(entity, context = 'default') {
        // entity: { name, entityType, observations: [] }
        const graph = await this.loadGraph(context);
        const existing = graph.entities.find(e => e.name === entity.name);
        
        if (existing) {
            // Merge observations
            const newObs = entity.observations.filter(o => !existing.observations.includes(o));
            existing.observations.push(...newObs);
        } else {
            graph.entities.push({
                name: entity.name,
                entityType: entity.entityType || 'concept',
                observations: entity.observations || []
            });
        }
        
        await this.saveGraph(graph, context);
        return entity.name;
    }

    async addRelation(relation, context = 'default') {
        // relation: { from, to, relationType }
        const graph = await this.loadGraph(context);
        
        // Check if relation exists
        const exists = graph.relations.some(r => 
            r.from === relation.from && 
            r.to === relation.to && 
            r.relationType === relation.relationType
        );

        if (!exists) {
            graph.relations.push(relation);
            await this.saveGraph(graph, context);
            return true;
        }
        return false;
    }

    async search(query, context = 'default') {
        const graph = await this.loadGraph(context);
        const q = query.toLowerCase();
        
        const entities = graph.entities.filter(e => 
            e.name.toLowerCase().includes(q) || 
            e.observations.some(o => o.toLowerCase().includes(q))
        );
        
        // Find relations connecting these entities
        const names = new Set(entities.map(e => e.name));
        const relations = graph.relations.filter(r => names.has(r.from) || names.has(r.to));
        
        return { entities, relations };
    }
    
    async getAll(context = 'default') {
        return await this.loadGraph(context);
    }
}

module.exports = new KnowledgeGraphManager();
