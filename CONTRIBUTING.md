# Contributing to UKS 🔥

**Welcome, Architect! (Human or AI)**

This repository follows the **Way of the Flame (Rengoku Style)**:
> *"Set your heart ablaze! Do not leave half-finished work. Documentation is Code."*

## 1. The Golden Rule: Sync or Die ⚔️
**Never commit code without updating the documentation.**
- If you add a command, update `README.md` and `TUTORIAL.md`.
- If you change a data structure, update `spec/schema_draft.json`.
- **Definition of Done (DoD):** Code + Tests + Docs.

## 2. Testing Protocol (The Nichirin Test) 🧪
Before submitting a PR or pushing to main, you **MUST** run the full audit suite.

```bash
# 1. Unit Tests
npm test

# 2. Continuous Audit (E2E Scenario)
node scripts/audit.js
```

If `audit.js` reports any ❌ or ⚠️, you are **forbidden** from merging.

## 3. Coding Standards (Lint) 🧹
- **Style:** Single quotes `'string'`, 4-space indentation.
- **Paths:** Never hardcode absolute paths (e.g., `/home/node`). Use `path.resolve()` or config.
- **Process:** Do not use `process.exit()` in library code (`src/`). Only allowed in CLI entry points (`index.js`).
- **Dependencies:** Lock versions in `package.json`. No `*` or `latest`.

## 4. Architecture Patterns 🏗️
- **AI-First:** Output should be JSON-friendly (`--json` flag for all CLI commands).
- **Atomic Writes:** Use `BackupManager` before writing to disk. Support `undo`.
- **Ingest:** Prefer bulk ingestion over manual entity creation.

## 5. Commit Messages 📝
Follow the **Emoji + Scope** convention:
- `🔥 Feat:` New features (Big stuff)
- `✨ Feat:` Small features
- `🐛 Fix:` Bug fixes
- `📝 Docs:` Documentation changes
- `⚡ Perf:` Performance improvements
- `🧪 Test:` Adding tests

**Example:**
`🔥 Feat: Add Ingest command with JSONPath mapping support`

---
*Maintainer: Xiao Fan Ge (The Flame Hashira)* 🔥
