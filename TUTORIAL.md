# UKS Tutorial (v1.0.0)

Welcome to the **Umai Knowledge Standard**!

## 1. Concepts

- **Bento Box (JSON):** The atomic unit of knowledge (dense, structured).
- **Knowledge Graph (JSONL):** The interconnected network of Bentos (Entities & Relations).
- **Ingest (Bot):** The act of consuming raw JSON files into the graph.
- **Container:** A wired set of managers created via `createContainer()` — the recommended entry point.

## 2. CLI Usage

### Configuration
Set your global storage path once, and forget it.
```bash
# Set path
uks config storagePath ./my_knowledge_graph
```

Or via environment variable:
```bash
export UKS_STORAGE_PATH=./my_knowledge_graph
```

### Adding Knowledge (Manual)
```bash
# Add an entity with tags (observations)
uks add-entity "Redis" "Database" -o "Cache,KV-Store"

# Link two entities
uks link "Redis" "supports" "HighConcurrency"

# View all data
uks dump
```

### Ingesting Files (Bulk)
The power move for AI Agents. Import existing JSON knowledge bases.

**Basic Usage:**
```bash
# Dry Run (Preview what will happen)
uks ingest "knowledge/**/*.json" --dry-run

# Real Run
uks ingest "knowledge/**/*.json"

# With JSON output for automation
uks ingest "knowledge/**/*.json" --json

# With strict schema validation
uks ingest "knowledge/**/*.json" --strict
```

**Advanced Usage (Mapping):**
Customize how JSON fields map to graph entities. Create `map.json`:
```json
{
    "entityName": "$.meta.slug",
    "entityType": "$.meta.category",
    "defaultType": "KnowledgeAsset",
    "relations": [
        { "path": "$.deps[*].id", "type": "depends_on" }
    ]
}
```
Run:
```bash
uks ingest "data/*.json" --map map.json
```

### Safety Net (Undo)
Made a mistake? Don't panic.
```bash
# Revert the last write operation
uks undo
```

### Querying
```bash
# Keyword search
uks search "Cache"

# Semantic search (vector-based, first run may download model)
uks search "in-memory data store" --semantic
```

### Visualization
```bash
# Start the web visualizer
uks serve

# With custom port and graph file
uks serve -p 8080 -f ./knowledge/graph-default.jsonl
```

## 3. Programmatic Usage

UKS can be used as a library via `@uks/core`:

```javascript
const { createContainer } = require('@uks/core');

// Create a container with all managers wired together
const { graphManager, vectorManager, ingestManager, config } = createContainer();

// Or with a custom storage path
const { graphManager } = createContainer({ storagePath: '/tmp/test-graph' });

// Add entities
const id = await graphManager.addEntity({
    name: 'Redis',
    entityType: 'Database',
    observations: ['In-memory', 'Key-Value store']
});

// Add relations
await graphManager.addRelation({
    from: 'Redis',
    to: 'Caching',
    relationType: 'supports'
});

// Search
const results = await graphManager.search('memory');
// => { entities: [...], relations: [...], metadata: { mode: 'keyword' } }

// Semantic search
const semanticResults = await vectorManager.search('fast data store');

// Undo
await graphManager.undo();
```

### Error Handling

All errors extend `UksError` with a `.code` property:

```javascript
const { createContainer, ValidationError, NotFoundError } = require('@uks/core');
const { graphManager } = createContainer();

try {
    await graphManager.addEntity({ name: '', entityType: 'Concept' });
} catch (e) {
    if (e.code === 'VALIDATION_ERROR') {
        console.log('Bad input:', e.message);
    }
    // Or use instanceof
    if (e instanceof ValidationError) { ... }
    // Serialize to JSON
    console.log(JSON.stringify(e.toJSON()));
}
```

## 4. Best Practices

- **Atomic Commits:** Always use `ingest` for large updates to ensure consistency.
- **Structured Tags:** Use `observations` for keywords like "v1.0", "Source:GitHub".
- **Audit Regularly:** Run `node scripts/audit.js` to ensure graph health.
- **Use Containers:** Always create managers via `createContainer()`, never import singletons.
- **Validate Early:** Use the `validator` utilities for any user input before passing to managers.

---
*Updated: 2026-02-14*
