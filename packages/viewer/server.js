// @ts-check
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve and validate GRAPH_FILE path to prevent path traversal
const DEFAULT_GRAPH = path.join(__dirname, '../../knowledge/graph-default.jsonl');
const requestedGraphFile = process.env.GRAPH_FILE || DEFAULT_GRAPH;
const GRAPH_FILE = path.resolve(requestedGraphFile);

// Security headers middleware
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
        "img-src 'self' data:"
    ].join('; '));
    next();
});

// CORS: only allow same-origin by default, configurable via env
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || null;
if (ALLOWED_ORIGIN) {
    app.use((_req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        next();
    });
}

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/graph', async (_req, res) => {
    if (!fs.existsSync(GRAPH_FILE)) {
        return res.status(404).json({ error: 'Graph file not found' });
    }

    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    const fileStream = fs.createReadStream(GRAPH_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    try {
        for await (const line of rl) {
            try {
                const item = JSON.parse(line);

                // Skip UKS file header
                if (item.type === '_aim') continue;

                // UKS Entity (Node)
                if (item.type === 'entity' && item.id) {
                    if (!nodeSet.has(item.id)) {
                        nodes.push({
                            id: item.id,
                            group: item.entityType || 'Concept',
                            label: item.name || item.id
                        });
                        nodeSet.add(item.id);
                    }
                }

                // UKS Relation (Link)
                if (item.type === 'relation' && item.fromId && item.toId) {
                    links.push({
                        source: item.fromId,
                        target: item.toId,
                        type: item.relationType || 'related'
                    });
                    if (!nodeSet.has(item.fromId)) {
                        nodes.push({ id: item.fromId, group: 'unknown', label: item.fromName || item.fromId });
                        nodeSet.add(item.fromId);
                    }
                    if (!nodeSet.has(item.toId)) {
                        nodes.push({ id: item.toId, group: 'unknown', label: item.toName || item.toId });
                        nodeSet.add(item.toId);
                    }
                }

                // Legacy format (backward compatibility)
                if (item.source && item.target && item.relation) {
                    links.push({ source: item.source, target: item.target, type: item.relation });
                    if (!nodeSet.has(item.source)) {
                        nodes.push({ id: item.source, group: 'unknown', label: item.source });
                        nodeSet.add(item.source);
                    }
                    if (!nodeSet.has(item.target)) {
                        nodes.push({ id: item.target, group: 'unknown', label: item.target });
                        nodeSet.add(item.target);
                    }
                }
            } catch {
                // Skip malformed JSON lines
            }
        }

        res.json({ nodes, links });
    } catch (e) {
        console.error('[Viewer] Error reading graph file:', /** @type {Error} */ (e).message);
        res.status(500).json({ error: 'Failed to read graph file' });
    }
});

app.listen(PORT, () => {
    console.error(`UKS Visualizer running at http://localhost:${PORT}`);
    console.error(`Serving graph: ${GRAPH_FILE}`);
});
