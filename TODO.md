# UKS v1.1.0 Roadmap (The Ecosystem Expansion) 🔌🔥

> **Goal:** Transform UKS from a standalone tool into a thriving ecosystem via Plugins.

## Phase 1: Plugin System (The Core)
- [ ] **Dynamic Plugin Loader**
    - Implement `loadPlugins()` in `PluginManager` to scan `node_modules/uks-plugin-*` or user-defined paths.
    - Define strict Plugin Interface (Lifecycle hooks: `onIngest`, `onSearch`).
- [ ] **Official Plugins**
    - `uks-plugin-python`: Auto-extract classes/functions from `.py` files into Bento Boxes.
    - `uks-plugin-markdown`: Intelligent chunking for `.md` files.

## Phase 2: Vector Scalability (The Brain)
- [ ] **Vector DB Adapter**
    - Abstraction layer for `VectorStore`.
    - Drivers for: `LanceDB` (Embedded, High Perf) and `Chroma` (Docker).

## Phase 3: Cloud Sync (The Reach)
- [ ] **S3/MinIO Driver**
    - Implement `S3Driver` for `packages/core`.
    - Enable multi-agent collaboration on a shared cloud graph.

---
*Maintained by Xiao Fan Ge (The Flame Hashira)* 🔥
