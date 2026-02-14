# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-14
### Added
- **Vector Intelligence:** Integrated `@xenova/transformers` for local embeddings and semantic search.
- **Schema Validation:** Strict JSON Schema definition (`spec/uks.schema.json`) and CLI enforcement.
- **Storage Drivers:** Defined `StorageDriver` interface and implemented `FsDriver` in `@uks/core`.
- **Undo System:** Batch-atomic undo for bulk operations.
- **Auto-Audit:** Continuous audit script (`scripts/audit.js`) running E2E tests.

### Changed
- **Architecture:** Split into Monorepo (`packages/cli`, `packages/core`, `packages/mcp-server`).
- **Versioning:** Standardized all packages to v0.2.0.

## [0.1.0] - 2026-02-14
### Added
- Initial release of the UKS Schema Draft (`spec/schema_draft.json`).
- CLI Tool v1.0.0 (Legacy) with basic graph operations.

---
*Maintained by Xiao Fan Ge (The Flame Hashira)* 🔥
