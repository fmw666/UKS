# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-14

### Official Release

All packages officially versioned at **1.0.0**. The architecture overhaul from 0.2.x is now considered stable.

### Architecture Overhaul (from 0.2.x)
- **Dependency Injection:** Eliminated all module-level singletons. All managers are now pure class exports. Added `createContainer()` factory for wiring.
- **Custom Error Hierarchy:** New `UksError` base class with typed subclasses: `ValidationError`, `LockError`, `StorageError`, `NotFoundError`, `PluginError`. All errors carry `.code` and `.toJSON()`.
- **Input Validation:** New `validator.js` module with `requireString()`, `sanitizeString()`, `validateObservations()`, `validateSafePath()`, `validateContext()`. Applied across CLI, MCP, and Core.
- **Config Refactor:** Replaced monkey-patched `Conf` instance with proper `UksConfig` wrapper class supporting `overrides` for testing.
- **File Lock Improvement:** Added stale PID detection (`process.kill(pid, 0)`), ownership verification on release, and fully async operations.

### Security
- **Viewer:** Added security headers (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy).
- **Viewer:** Added configurable CORS via `CORS_ORIGIN` environment variable.
- **Viewer:** Pinned CDN dependency version with `crossorigin="anonymous"`.
- **Viewer:** Added loading state and error display in frontend.
- **MCP Server:** All tool arguments are now validated and sanitized before processing.

### Code Quality
- **Type Safety:** Added `@ts-check` and complete JSDoc annotations to all source files.
- **ESLint:** Added `.eslintrc.json` with 15+ rules (no-var, eqeqeq, no-eval, etc.).
- **Prettier:** Added `.prettierrc` for consistent formatting.
- **jsconfig.json:** Added for IDE type checking and path resolution.

### Testing
- **New test files:** `errors.test.js`, `validator.test.js`, `graph-manager.test.js`.
- **Expanded coverage:** From ~10 to 38+ test cases. Added error-case tests, validation tests, undo tests.
- **Updated existing tests:** Adapted to new DI-based API (`createContainer()`).

### Cleanup
- **API Exports:** Cleaned `core/index.js` to consistent categories (Classes / Drivers / Errors / Validator / Container).
- **Schema Dedup:** Removed duplicate `spec/uks.schema.json`. Canonical copy at `packages/core/schemas/`.
- **Version Alignment:** All packages unified at 1.0.0.
- **Semantic Search:** Removed duplicate vector search logic from `GraphManager.search()`. Semantic search is now exclusively handled by `VectorManager`.
- **CLI:** All 7 commands now have proper try/catch with unified `handleError()`.

## [0.2.0] - 2026-02-14
### Added
- **Vector Intelligence:** Integrated `@xenova/transformers` for local embeddings and semantic search.
- **Schema Validation:** Strict JSON Schema definition and CLI enforcement.
- **Storage Drivers:** Defined `StorageDriver` interface and implemented `FsDriver` in `@uks/core`.
- **Undo System:** Batch-atomic undo for bulk operations.
- **Auto-Audit:** Continuous audit script (`scripts/audit.js`) running E2E tests.

### Changed
- **Architecture:** Split into Monorepo (`packages/cli`, `packages/core`, `packages/mcp-server`).

## [0.1.0] - 2026-02-14
### Added
- Initial release of the UKS Schema Draft (`spec/schema_draft.json`).
- CLI Tool with basic graph operations.

---
*Maintained by Xiao Fan Ge (The Flame Hashira)*
