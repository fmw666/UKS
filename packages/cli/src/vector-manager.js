const { pipeline } = require('@xenova/transformers');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

const STORAGE_PATH = process.env.UKS_STORAGE_PATH || config.get('storagePath') || path.resolve(process.cwd(), '.northstar');
const VECTOR_FILE = path.join(STORAGE_PATH, 'vectors.jsonl');

class VectorManager {
    constructor() {
        this.pipeline = null;
        this.vectors = [];
    }

    async init() {
        if (!this.pipeline) {
            // Lazy load model (download on first run)
            this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        await this.loadVectors();
    }

    async loadVectors() {
        try {
            const data = await fs.readFile(VECTOR_FILE, 'utf-8');
            this.vectors = data.split('\n')
                .filter(l => l.trim())
                .map(l => JSON.parse(l));
        } catch (e) {
            this.vectors = []; // Valid empty state
        }
    }

    async generateEmbedding(text) {
        if (!this.pipeline) await this.init();
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

        // Persist (Append-only for now, ideally should rewrite or use proper DB)
        // For simplicity in CLI: rewrite file
        await this.saveVectors();
    }

    async saveVectors() {
        const lines = this.vectors.map(v => JSON.stringify(v));
        await fs.writeFile(VECTOR_FILE, lines.join('\n'));
    }

    // Cosine Similarity Search
    async search(queryText, topK = 5) {
        const queryVec = await this.generateEmbedding(queryText);
        
        const results = this.vectors.map(doc => {
            const score = this.cosineSimilarity(queryVec, doc.vector);
            return { id: doc.id, score, text: doc.text };
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
