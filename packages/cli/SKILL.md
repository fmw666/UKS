---
name: knowledge-graph
description: Manage a local knowledge graph (Entities & Relations) to index the workspace.
---

# Knowledge Graph Skill

A local port of `mcp-knowledge-graph` logic. Used to build a semantic layer over the file-based knowledge base.

## Usage

### CLI
```bash
node skills/knowledge-graph/index.js add-entity "Node.js" "Technology"
node skills/knowledge-graph/index.js link "NestJS" "uses" "Node.js"
node skills/knowledge-graph/index.js search "Node"
```

### Module
```javascript
const kg = require('./skills/knowledge-graph');
await kg.addEntity({ name: 'Architecture', entityType: 'Concept' });
```

## Storage
Data is stored in `memory/knowledge_graph/graph-default.jsonl`.
