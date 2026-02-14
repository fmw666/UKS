# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-14
### Added
- **UUID Support:** Entities now use `crypto.randomUUID()` as primary keys for stability.
- **Auto-Migration:** Automatically upgrades v1.0.0 graphs (name-based) to v1.1.0 (uuid-based) on load.
- **Concurrency Control:** Implemented `.lock` file mechanism to prevent race conditions during write operations.
- **Dynamic Storage:** Added `UKS_STORAGE_PATH` env variable support for custom storage locations.
- **Shebang:** Added `#!/usr/bin/env node` to CLI entry point for executable support.

### Changed
- **Code Style:** Enforced single quotes and 4-space indentation via `.editorconfig`.

## [1.0.0] - 2026-02-14
### Added
- **CLI:** Released `uks` command-line interface (`packages/cli`).
- **Documentation:** Added `AI_PROTOCOL.md` for bot integration and `TUTORIAL.md` for human onboarding.
- **Examples:** Added `express_middleware.json` as a "Bento Box" sample.
- **Community:** Added `LICENSE` (MIT) and `CONTRIBUTING.md`.

### Changed
- **Architecture:** Refactored project into a Monorepo structure (`packages/cli`).
- **Branding:** Renamed from "Project North Star" to **UKS (Umai Knowledge Standard)**.

## [0.1.0] - 2026-02-14
### Added
- Initial release of the UKS Schema Draft (`spec/schema_draft.json`).
- Core philosophy and "Bento Box" concept definition.

---
*Maintained by Xiao Fan Ge (The Flame Hashira)* 🔥
