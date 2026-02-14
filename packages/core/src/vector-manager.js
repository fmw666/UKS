const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const graphManager = require('./graph-manager'); // Import GraphManager

const STORAGE_PATH = process.env.UKS_STORAGE_PATH || config.get('storagePath') || path.resolve(process.cwd(), '.northstar');
const VECTOR_FILE = path.join(STORAGE_PATH, 'vectors.jsonl');

class VectorManager {
    constructor() {
        this.pipeline = null;
        this.vectors = [];
        this.loaded = false;
    }

    async init() {
        if (!this.pipeline) {
            try {
                // Dynamic import to avoid load-time errors in environments without ONNX support
                const { pipeline } = require('@xenova/transformers');
                // console.error('🔌 Initializing Feature Extraction Pipeline (Xenova/all-MiniLM-L6-v2)...'); 
                this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            } catch (e) {
                console.warn('[VectorManager] Failed to load transformers. Semantic search disabled.', e.message);
            }
        }
        if (!this.loaded) {
            await this.loadVectors();
        }
    }

    async loadVectors() {
        try {
            const data = await fs.readFile(VECTOR_FILE, 'utf-8');
            this.vectors = data.split('\n')
                .filter(l => l.trim())
                .map(l => JSON.parse(l));
            this.loaded = true;
        } catch (e) {
            this.vectors = []; // Valid empty state
            this.loaded = true;
        }
    }

    async generateEmbedding(text) {
        if (!this.pipeline) await this.init();
        
        // Graceful degradation if pipeline failed to load (e.g. CI environment)
        if (!this.pipeline) {
            // Return zero vector of dimension 384 (all-MiniLM-L6-v2 size)
            return new Array(384).fill(0);
        }

        const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data); // Convert Float32Array to regular array for JSON
    }

    async upsert(id, text) {
        if (!text) return;
        const embedding = await this.generateEmbedding(text);
        
        // Update memory
        const index = this.vectors.findIndex(v => v.id === id);
        const record = { id, text: text.substring(0, 100), vector: embedding };
        
        if (index >= 0) {
            this.vectors[index] = record;
        } else {
            this.vectors.push(record);
        }
        
        // We defer saving to batch operations where possible, but for single upsert we save.
        await this.saveVectors();
    }

    async saveVectors() {
        const lines = this.vectors.map(v => JSON.stringify(v));
        await fs.writeFile(VECTOR_FILE, lines.join('\n'));
    }

    // Bulk Embed All Entities from Graph
    async embedAll(force = false) {
        await this.init();
        
        // Load entities from GraphManager
        // console.log('📦 Loading Knowledge Graph...');
        const graph = await graphManager.getAll(); // Assuming default context
        const entities = graph.entities || [];
        
        // console.log(`🔍 Found ${entities.length} entities.`);
        let count = 0;

        for (const entity of entities) {
            // Check if already embedded
            const existing = this.vectors.find(v => v.id === entity.id);
            if (existing && !force) {
                continue;
            }

            // Construct text representation
            // Richer context: Name + Type + Observations
            const text = `[${entity.entityType || 'Concept'}] ${entity.name}. ${(entity.observations || []).join('. ')}`;
            
            // console.log(`🧠 Embedding: ${entity.name}...`);
            const embedding = await this.generateEmbedding(text);

            // Update in-memory vector store
            const index = this.vectors.findIndex(v => v.id === entity.id);
            const record = { 
                id: entity.id, 
                text: text, // Store full text for context in search results
                vector: embedding,
                metadata: { type: entity.entityType, name: entity.name }
            };

            if (index >= 0) {
                this.vectors[index] = record;
            } else {
                this.vectors.push(record);
            }
            count++;
        }

        if (count > 0) {
            // console.log(`💾 Saving ${this.vectors.length} vectors to disk...`);
            await this.saveVectors();
        } else {
            // console.log('✨ No new embeddings needed.');
        }

        return count;
    }

    // Cosine Similarity Search
    async search(queryText, topK = 5) {
        await this.init(); // Ensure loaded
        
        const queryVec = await this.generateEmbedding(queryText);
        
        const results = this.vectors.map(doc => {
            const score = this.cosineSimilarity(queryVec, doc.vector);
            return { 
                id: doc.id, 
                score, 
                text: doc.text,
                metadata: doc.metadata 
            };
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    cosineSimilarity(vecA, vecB) {
        let dot = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

module.exports = new VectorManager();
