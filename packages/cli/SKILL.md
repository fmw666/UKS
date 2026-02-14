---
name: knowledge-graph
description: Manage a local knowledge graph (Entities & Relations) to index the workspace.
---

# Knowledge Graph Skill

A local knowledge graph engine built on UKS (Umai Knowledge Standard). Used to build a semantic layer over file-based knowledge bases.

## Usage

### CLI
```bash
# Add an entity
uks add-entity "Node.js" "Technology" -o "JavaScript runtime,V8 engine"

# Link entities
uks link "NestJS" "uses" "Node.js"

# Search (keyword)
uks search "Node"

# Search (semantic)
uks search "backend runtime" --semantic

# Bulk ingest
uks ingest "knowledge/**/*.json" --json

# Undo last change
uks undo
```

### Programmatic (Node.js)
```javascript
const { createContainer } = require('@uks/core');
const { graphManager, vectorManager } = createContainer();

// Add entity
await graphManager.addEntity({ name: 'Architecture', entityType: 'Concept', observations: ['Design patterns'] });

// Search
const results = await graphManager.search('patterns');

// Semantic search
const semantic = await vectorManager.search('software design');
```

### MCP Server
Configure in your AI agent's MCP settings:
```json
{
    "mcpServers": {
        "uks": {
            "command": "node",
            "args": ["packages/mcp-server/index.js"]
        }
    }
}
```

Available tools: `search_knowledge`, `read_graph`, `add_entity`, `add_relation`.

## Storage

Data is stored in JSONL format at the configured storage path (default: `knowledge/uks_graph/`).
- `graph-default.jsonl` — Entity and relation data
- `vectors.jsonl` — Embedding vectors for semantic search
- `.backups/` — Automatic backup snapshots (last 5 retained)

## Error Handling

All errors are typed with error codes:
- `VALIDATION_ERROR` — Bad input (empty name, invalid type, etc.)
- `NOT_FOUND` — Referenced entity doesn't exist
- `LOCK_ERROR` — Graph is busy (concurrent access)
- `STORAGE_ERROR` — File I/O failure
