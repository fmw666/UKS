#!/usr/bin/env node
'use strict';

/**
 * Start the Viewer from the repo root.
 * Uses the CLI's bundled graph data by default.
 * Override via: GRAPH_FILE=/path/to/graph.jsonl npm run viewer
 */
const path = require('path');
const defaultGraph = path.resolve(__dirname, '../packages/cli/knowledge/uks_graph/graph-default.jsonl');
process.env.GRAPH_FILE = process.env.GRAPH_FILE || defaultGraph;
require('../packages/viewer/server.js');
