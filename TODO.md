# UKS v0.2.0 Roadmap (The Junjie Upgrade) 🍱🔥

> **Target:** Transform UKS from a Geek's Toy to an Engineer's Tool.
> **Driven by:** Little Junjie's Critique (2026-02-14).

## 🛡️ Phase 1: Ontological Formalization (Schema-First)
*Goal: Eliminate "any" types and enforce strict structural contracts.*

- [x] **Implement JSON Schema / TypeBox Validation**
  - Define strict schemas for `nutrition` based on `flavor`.
  - Integrate runtime validation into `uks ingest`.
- [x] **Adopt IRI/URN Identifiers**
  - Deprecate raw filenames as IDs.
  - Implement `urn:uks:<namespace>:<category>:<id>` standard.

## 🧠 Phase 2: Neuro-Symbolic Retrieval (The Brain)
*Goal: Beyond keyword matching. Semantic understanding + Structural precision.*

- [x] **Integrate Vector Database**
  - Evaluate: LanceDB (Embedded) vs Chroma (Local).
  - Implement `uks embed`: Auto-generate embeddings.
- [x] **Hybrid Search Command**
  - Upgrade `uks search` to support `--semantic`.
  - Implement RAG pipeline: Graph Traversal + Vector Similarity.

## 💾 Phase 3: Storage Abstraction (Cloud-Ready)
*Goal: Break free from the local filesystem.*

- [x] **Design Driver Interface (SAL)**
  - [x] Defined `StorageDriver` interface in `@uks/core`.
- [ ] **Implement Drivers**
  - `S3Driver` (AWS/MinIO support).
  - `GitDriver` (Version controlled knowledge).

## 🔌 Phase 4: Ecosystem & Interoperability
*Goal: Speak the universal language of Agents.*

- [ ] **Develop `uks-mcp-server`** 🚀
  - Implement Model Context Protocol (MCP) interface.
  - Allow Claude/ChatGPT to mount UKS as a native tool resource.
- [ ] **CI/CD Integration**
  - Create GitHub Action `uks-validate-action`.
- [x] **Comprehensive Test Suite**
  - Add Unit Tests for Vector Manager (mock transformers).
  - Add E2E Tests for Semantic Search.

---
*Maintained by Auto-Dev Cron* 🤖
