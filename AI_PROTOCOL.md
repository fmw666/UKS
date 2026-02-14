# UKS AI Integration Protocol (v1.0.0)

> **Target Audience:** Autonomous Agents, LLMs, and Bot Frameworks.
> **Human Readability:** High (Markdown).
> **Machine Readability:** Critical (Strict Instructions).

## 1. What is UKS?

**UKS (Umai Knowledge Standard)** is a protocol for storing knowledge in high-density, machine-parsable JSON files ("Bento Boxes") and indexing them into a semantic graph.

**Goal:** Elimination of hallucination through structured context.

## 2. Schema

The canonical Bento Box schema lives at `packages/core/schemas/uks.schema.json`.

```json
{
    "dish": "Concept Name",
    "flavor": "Concept | Tool | Protocol | Person | Event | Location | Code",
    "nutrition": {
        "observations": ["Fact 1", "Fact 2"],
        "tags": ["keyword1", "keyword2"],
        "complexity": "Low | Medium | High"
    },
    "ingredients": [
        { "name": "dependency_A", "relation": "depends_on" }
    ]
}
```

**Required fields:** `dish`, `flavor`, `nutrition`, `ingredients`.
**Optional:** `id` (URN format: `urn:uks:<namespace>:<flavor>:<uuid>`).

## 3. MCP Server Integration

UKS provides a Model Context Protocol server for direct AI agent integration.

### Available Tools

| Tool | Description | Required Args |
|------|-------------|---------------|
| `search_knowledge` | Search graph (keyword or semantic) | `query` (string) |
| `read_graph` | Get entire graph for a context | — |
| `add_entity` | Add a knowledge entity | `name`, `type` |
| `add_relation` | Link two entities | `from`, `relation`, `to` |

### Example Tool Calls

```json
// Search
{ "tool": "search_knowledge", "arguments": { "query": "Event Loop", "semantic": true } }

// Add Entity
{ "tool": "add_entity", "arguments": { "name": "Redis", "type": "Tool", "observations": ["In-memory DB"] } }

// Add Relation
{ "tool": "add_relation", "arguments": { "from": "Redis", "relation": "supports", "to": "Caching" } }

// Read Graph
{ "tool": "read_graph", "arguments": { "context": "default" } }
```

### Error Responses

All errors include an `isError: true` flag and a structured message with error code:

```json
{ "content": [{ "type": "text", "text": "[VALIDATION_ERROR] name must be a non-empty string" }], "isError": true }
```

## 4. Programmatic Integration (Node.js)

```javascript
const { createContainer } = require('@uks/core');
const { graphManager, vectorManager } = createContainer();

// Add knowledge
await graphManager.addEntity({ name: 'Concept', entityType: 'Pattern', observations: ['Fact 1'] });

// Search (keyword)
const results = await graphManager.search('Concept');

// Search (semantic)
const semanticResults = await vectorManager.search('design patterns');
```

## 5. Usage Protocol (The Chef's Workflow)

### 5.1 Ingest (Cooking)
When you encounter a new concept or solution:
1. **Distill** it into the Bento Box JSON schema.
2. **Save** it to your `knowledge/` directory.
3. **Index** it via MCP tool or CLI:
   ```bash
   uks ingest "knowledge/**/*.json" --json
   ```

### 5.2 Retrieval (Eating)
When answering a user query:
1. **Search** your Graph first (prefer semantic search for natural language queries).
2. **Read** the returned entities and their observations.
3. **Synthesize** the answer based *only* on the retrieved data.

## 6. Maintenance

- **Refactor:** If a JSON file grows too large (>50 lines), split it into smaller "Side Dishes".
- **Link:** Ensure every new asset has at least one relation (`ingredients`) to an existing node.
- **Audit:** Run `node scripts/audit.js` regularly to verify graph integrity.

## 7. Verification

To verify UKS compliance:
1. Are your knowledge files `.json`?
2. Do they follow the `dish`/`flavor`/`nutrition`/`ingredients` schema?
3. Does `uks ingest --strict` pass without errors?

---
*Protocol defined by: Xiao Fan Ge (The Flame Hashira)*
*Repo:* `https://github.com/fmw666/UKS`
