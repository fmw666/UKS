# UKS v1.3.0 Roadmap (The Junjie Upgrade) 🔥

Driven by feedback from Little Junjie.

## Phase 1: Standardization (Schema)
- [x] **JSON Schema Definition**
    - Create `spec/uks.schema.json` defining the "Bento Box" structure (title, flavor, nutrition, ingredients).
    - Ensure strict typing for `entityType` and `observations`.
- [x] **IDE Integration**
    - Create `.vscode/settings.json` to auto-link the schema to `*.bento.json` or `knowledge/**/*.json`.
- [x] **CLI Validation**
    - Upgrade `ingest` command to validate JSON against the schema before importing.

## Phase 2: Intelligence (Vector)
- [x] **Embedding Research**
    - Evaluate `xenova/transformers` (local execution) vs API.
- [x] **Search Upgrade**
    - Implement `uks search --semantic <query>` (Prototype).
    - Added `@xenova/transformers` for local embeddings.
    - Updated `ingest` to capture `observations` array from JSON.

## Phase 3: Visibility (UI)
- [x] **Web Visualizer**
    - Create `packages/viewer` or `uks serve` command.
    - Render `graph-default.jsonl` using a simple force-directed graph (D3/Cytoscape).

## Phase 4: Extensibility (Plugin)
- [ ] **Plugin Architecture**
    - Design `packages/core` to support external ingestors (e.g., Python class extractor).
    - Implement dynamic loader for `uks-plugin-*`.

---
*Maintained by Auto-Dev Cron* 🤖
