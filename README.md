# UKS (Umai Knowledge Standard)

> **"Umai!" (Delicious!)** — *Kyojuro Rengoku*

The **Bento Box** for AI Knowledge Management. A high-density, nutritious standard for feeding Knowledge Graphs to AI Agents.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v1.0.0-red)
![Taste](https://img.shields.io/badge/taste-Delicious-orange)

## What is UKS?

Most documentation is like a messy buffet — hard for AI to digest.
**UKS** packs knowledge into **Bento Boxes**: structured, schema-validated JSON units that are high in "Information Density" (Nutrition) and low in token waste.

It serves two masters:
1.  **Humans:** Who enjoy the architecture and clarity.
2.  **AI Agents:** Who devour the JSON schemas and Graph relations.

## Core Philosophy

1.  **AI-First:** JSON/Schema over prose. Data must be machine-readable first.
2.  **Density:** Maximize info/token ratio. No empty calories (fluff words).
3.  **Graph-Based:** Knowledge Graph (Nodes & Edges), not folder trees.

## Architecture

UKS is organized as a **monorepo** (`npm workspaces`):

| Package | Description |
|---------|-------------|
| `@uks/core` | Core library — GraphManager, VectorManager, IngestManager, BackupManager, PluginManager |
| `uks-cli` | Command-line interface |
| `uks-mcp-server` | Model Context Protocol server for AI agent integration |
| `@uks/viewer` | Web-based graph visualizer |

**Key design principles:**
- **Dependency Injection** — All managers are classes created via `createContainer()`, no global singletons
- **Unified Error Handling** — Custom error hierarchy (`UksError` → `ValidationError` / `LockError` / `StorageError` / `NotFoundError` / `PluginError`) with error codes
- **Input Validation** — All public APIs validate and sanitize inputs
- **Type Safety** — Full JSDoc annotations with `@ts-check` enforcement

## Quick Start

```bash
# Install
npm install

# Configure storage path (optional, defaults to ./knowledge/uks_graph)
npm run cli -- config storagePath ./knowledge/graph

# Add an entity
npm run cli -- add-entity "NestJS" "Framework" -o "Backend,TypeScript"

# Bulk ingest JSON files
npm run cli -- ingest "knowledge/**/*.json" --json

# Search (keyword)
npm run cli -- search "Backend"

# Search (semantic / vector)
npm run cli -- search "Backend" --semantic

# Undo last change
npm run cli -- undo

# Visualize the graph
npm run viewer
```

## Programmatic Usage

```javascript
const { createContainer } = require('@uks/core');

// Create a fully-wired set of managers
const { graphManager, vectorManager, ingestManager } = createContainer();

// Or with custom storage path
const ctx = createContainer({ storagePath: './my_graph' });

await ctx.graphManager.addEntity({ name: 'Node.js', entityType: 'Tool', observations: ['JavaScript runtime'] });
await ctx.graphManager.addRelation({ from: 'Node.js', to: 'Express', relationType: 'supports' });

const results = await ctx.graphManager.search('runtime');
```

## Features

- **Vector Intelligence:** Local embeddings (`@xenova/transformers`) for semantic search.
- **Schema Validation:** Strict hygiene checks (`ajv`) against `packages/core/schemas/uks.schema.json`.
- **Ingest Engine:** Bulk import with JSONPath mapping and plugin support.
- **Undo System:** Atomic batch updates with backup rotation and rollback.
- **MCP Server:** Model Context Protocol integration for AI agents.
- **Audit Suite:** Built-in self-check script (`scripts/audit.js`) for E2E validation.

## Development

```bash
# Run all tests
npm test

# Custom lint (no console.log in library code)
npm run lint

# ESLint
npm run lint:eslint

# Prettier format check
npm run format:check

# E2E audit
npm run e2e
```

## Documentation

- [TUTORIAL.md](./TUTORIAL.md) — CLI usage guide
- [AI_PROTOCOL.md](./AI_PROTOCOL.md) — Integration protocol for AI agents
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines
- [LOCAL.md](./LOCAL.md) — Local development instructions
- [CHANGELOG.md](./CHANGELOG.md) — Version history

---
*Maintained by Xiao Fan Ge (The Flame Hashira)*
