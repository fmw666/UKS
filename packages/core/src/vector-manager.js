// @ts-check
'use strict';

const fs = require('fs').promises;
const path = require('path');
const { StorageError } = require('./errors');
const { requireString } = require('./validator');

/**
 * @typedef {object} VectorRecord
 * @property {string} id
 * @property {string} text
 * @property {number[]} vector
 * @property {object} [metadata]
 */

/**
 * @typedef {object} VectorManagerOptions
 * @property {string} [storagePath] - Directory to store vectors.jsonl
 * @property {import('./graph-manager').KnowledgeGraphManager} [graphManager] - Injected graph manager
 */

/** Embedding model dimension (all-MiniLM-L6-v2). */
const VECTOR_DIM = 384;

/**
 * Manages vector embeddings for semantic search.
 * Supports local embedding via @xenova/transformers with graceful degradation.
 *
 * NOTE: No singleton — always create via `new` or use `createContainer()`.
 */
class VectorManager {
    /**
     * @param {VectorManagerOptions} [options]
     */
    constructor(options = {}) {
        /** @type {string} */
        this.storagePath = options.storagePath
            || process.env.UKS_STORAGE_PATH
            || path.resolve(process.cwd(), './knowledge/uks_graph');
        /** @type {string} */
        this.vectorFile = path.join(this.storagePath, 'vectors.jsonl');
        /** @type {import('./graph-manager').KnowledgeGraphManager|null} */
        this.graphManager = options.graphManager || null;
        /** @private @type {Function|null} */
        this._pipeline = null;
        /** @type {VectorRecord[]} */
        this.vectors = [];
        /** @type {boolean} */
        this.loaded = false;
    }

    /**
     * Lazily initialize the embedding pipeline and load vectors from disk.
     * @returns {Promise<void>}
     */
    async init() {
        if (!this._pipeline) {
            try {
                const { pipeline } = await import('@xenova/transformers');
                this._pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            } catch (e) {
                console.warn('[VectorManager] Failed to load transformers. Semantic search disabled.', /** @type {Error} */ (e).message);
            }
        }
        if (!this.loaded) {
            await this.loadVectors();
        }
    }

    /**
     * Load vector records from the JSONL file.
     * @returns {Promise<void>}
     */
    async loadVectors() {
        try {
            const data = await fs.readFile(this.vectorFile, 'utf-8');
            this.vectors = data.split('\n')
                .filter(l => l.trim())
                .map(l => JSON.parse(l));
            this.loaded = true;
        } catch {
            this.vectors = [];
            this.loaded = true;
        }
    }

    /**
     * Generate an embedding vector for the given text.
     * Falls back to a zero vector if the ML pipeline is unavailable.
     *
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async generateEmbedding(text) {
        if (!this._pipeline) await this.init();

        if (!this._pipeline) {
            // Graceful degradation: zero vector (e.g., in CI without ML libs)
            return new Array(VECTOR_DIM).fill(0);
        }

        const output = await this._pipeline(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    /**
     * Insert or update a vector record.
     * @param {string} id - Entity ID
     * @param {string} text - Text to embed
     * @returns {Promise<void>}
     */
    async upsert(id, text) {
        if (!text) return;
        requireString(id, 'id');

        const embedding = await this.generateEmbedding(text);
        const record = { id, text: text.substring(0, 200), vector: embedding };

        const index = this.vectors.findIndex(v => v.id === id);
        if (index >= 0) {
            this.vectors[index] = record;
        } else {
            this.vectors.push(record);
        }

        await this.saveVectors();
    }

    /**
     * Persist all vectors to disk.
     * @returns {Promise<void>}
     */
    async saveVectors() {
        try {
            await fs.mkdir(this.storagePath, { recursive: true });
            const lines = this.vectors.map(v => JSON.stringify(v));
            await fs.writeFile(this.vectorFile, lines.join('\n'));
        } catch (e) {
            throw new StorageError(`Failed to save vectors: ${/** @type {Error} */ (e).message}`);
        }
    }

    /**
     * Embed all entities from the graph.
     * @param {boolean} [force=false] - Re-embed even if already present
     * @returns {Promise<number>} Number of newly embedded entities
     */
    async embedAll(force = false) {
        if (!this.graphManager) {
            throw new StorageError('VectorManager requires a graphManager to embed all entities');
        }
        await this.init();

        const graph = await this.graphManager.getAll();
        const entities = graph.entities || [];
        let count = 0;

        for (const entity of entities) {
            const existing = this.vectors.find(v => v.id === entity.id);
            if (existing && !force) continue;

            const text = `[${entity.entityType || 'Concept'}] ${entity.name}. ${(entity.observations || []).join('. ')}`;
            const embedding = await this.generateEmbedding(text);

            const record = {
                id: entity.id,
                text,
                vector: embedding,
                metadata: { type: entity.entityType, name: entity.name }
            };

            const index = this.vectors.findIndex(v => v.id === entity.id);
            if (index >= 0) {
                this.vectors[index] = record;
            } else {
                this.vectors.push(record);
            }
            count++;
        }

        if (count > 0) {
            await this.saveVectors();
        }
        return count;
    }

    /**
     * Semantic search: find the top-K most similar vectors to the query.
     * @param {string} queryText
     * @param {number} [topK=5]
     * @returns {Promise<Array<{id: string, score: number, text: string, metadata?: object}>>}
     */
    async search(queryText, topK = 5) {
        requireString(queryText, 'queryText');
        await this.init();

        const queryVec = await this.generateEmbedding(queryText);

        const results = this.vectors.map(doc => {
            const score = VectorManager.cosineSimilarity(queryVec, doc.vector);
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

    /**
     * Compute cosine similarity between two vectors.
     * Static method — no instance state needed.
     *
     * @param {number[]} vecA
     * @param {number[]} vecB
     * @returns {number} Similarity score in [-1, 1]
     */
    static cosineSimilarity(vecA, vecB) {
        let dot = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        const len = Math.min(vecA.length, vecB.length);
        for (let i = 0; i < len; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

module.exports = { VectorManager };
