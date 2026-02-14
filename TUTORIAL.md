# UKS Tutorial (v1.2.0) 🔥

Welcome to the **Umai Knowledge Standard**!

## 1. Concepts
- **Bento Box (JSON):** The atomic unit of knowledge (dense, structured).
- **Knowledge Graph (JSONL):** The interconnected network of Bentos (Entities & Relations).
- **Ingest (Bot):** The act of consuming raw JSON files into the graph.

## 2. CLI Usage (uks)

### Configuration (New!)
Set your global storage path once, and forget it.
```bash
# Set path
uks config storagePath ./my_knowledge_graph

# Check value (by looking at ~/.uksrc or similar)
# (Currently no 'get' command, but 'set' persists it)
```

### Adding Knowledge (Manual)
Great for quick notes or corrections.
```bash
# Add an entity with tags (observations)
uks add-entity "Redis" "Database" -o "Cache,KV-Store"

# Link two entities
uks link "Redis" "supports" "HighConcurrency"
```

### Ingesting Files (Bulk) (New!)
The power move for AI Agents. Import existing JSON knowledge bases.

**Basic Usage:**
```bash
# Dry Run (Preview what will happen)
uks ingest "knowledge/**/*.json" --dry-run

# Real Run
uks ingest "knowledge/**/*.json"
```

**Advanced Usage (Mapping):**
You can customize how JSON fields map to graph entities.
Create `map.json`:
```json
{
  "entityName": "$.meta.slug",
  "relations": [
    { "path": "$.deps[*].id", "type": "depends_on" }
  ]
}
```
Run:
```bash
uks ingest "data/*.json" --map map.json
```

### Safety Net (Undo) (New!)
Made a mistake? Don't panic.
```bash
# Revert the last write operation
uks undo

# Output: ✅ Reverted to backup: ...
```

### Querying
Find what you need.
```bash
# Search by name or tag
uks search "Cache"
```

## 3. Best Practices
- **Atomic Commits:** Always use `ingest` for large updates to ensure consistency.
- **Structured Tags:** Use `observations` for keywords like "v1.0", "Source:GitHub".
- **Audit Regularly:** Run `node scripts/audit.js` to ensure graph health.

---
*Updated: 2026-02-14*
