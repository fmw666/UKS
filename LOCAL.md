# Local Development & Usage

Run the following commands from the repository root to use the CLI and web visualizer locally.

## 1. Installation

```bash
npm install
```

## 2. Using the CLI

All commands are run via `npm run cli -- <subcommand> [options]` (arguments after `--` are passed to uks).

**Configure storage path (optional, defaults to `./knowledge/uks_graph`):**

```bash
npm run cli -- config storagePath ./knowledge/graph
```

**Add an entity:**

```bash
npm run cli -- add-entity "NestJS" "Framework" -o "Backend,TypeScript"
```

**Bulk ingest JSON files:**

```bash
npm run cli -- ingest "knowledge/**/*.json" --json
```

**Keyword search:**

```bash
npm run cli -- search "Backend"
```

**Semantic search (requires local model; first run may be slow):**

```bash
npm run cli -- search "Backend" --semantic
```

**Undo last write operation:**

```bash
npm run cli -- undo
```

**Dump graph data:**

```bash
npm run cli -- dump
```

## 3. Web Visualizer (Viewer)

Start from the repo root:

```bash
npm run viewer
```

Open in browser: **http://localhost:3000**

By default it reads `packages/cli/knowledge/uks_graph/graph-default.jsonl`. To specify a different graph file:

- **PowerShell:** `$env:GRAPH_FILE="E:\path\to\graph-default.jsonl"; npm run viewer`
- **Cmd:** `set GRAPH_FILE=E:\path\to\graph-default.jsonl && npm run viewer`

## 4. Launch Viewer via CLI (with graph path)

```bash
npm run cli -- serve -f ./knowledge/uks_graph/graph-default.jsonl -p 3000
```

## 5. Programmatic Usage

```javascript
const { createContainer } = require('@uks/core');

// Create a container (all managers are auto-wired with dependencies)
const { graphManager, vectorManager, ingestManager } = createContainer();

// Custom storage path
const ctx = createContainer({ storagePath: './my_graph' });

// Add an entity
await ctx.graphManager.addEntity({ name: 'Redis', entityType: 'Database', observations: ['Cache', 'KV Store'] });

// Search
const result = await ctx.graphManager.search('Cache');
```

## 6. Development & Testing

```bash
# Run all tests
npm test

# Custom lint (no console.log in library code)
npm run lint

# ESLint code quality check
npm run lint:eslint

# Prettier format check
npm run format:check

# E2E audit
npm run e2e
```

---

**Tip:** If installed globally or via `npx uks-cli`, you can run `uks <subcommand>` directly without `npm run cli --`.
