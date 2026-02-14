# Contributing to UKS

**Welcome, Architect! (Human or AI)**

## 1. The Golden Rule: Sync or Die

**Never commit code without updating the documentation.**
- If you add a command, update `README.md` and `TUTORIAL.md`.
- If you change a data structure, update `packages/core/schemas/uks.schema.json`.
- If you change architecture, update `docs/ARCHITECTURE_REVIEW.md`.
- **Definition of Done (DoD):** Code + Tests + Docs.

## 2. Architecture Principles

- **No Singletons** — All managers are classes. Use `createContainer()` to wire them.
- **Dependency Injection** — Managers accept dependencies via constructor `options`.
- **Clean Boundaries** — CLI/MCP/Viewer import only from `@uks/core`, never internal paths like `../core/src/`.
- **Unified Errors** — Throw `ValidationError`, `LockError`, `StorageError`, `NotFoundError`, or `PluginError`. Never throw raw strings.
- **Validate Input** — Use `validator.js` utilities (`requireString`, `sanitizeString`, etc.) for all user-facing inputs.

## 3. Testing Protocol

Before submitting a PR or pushing to main, you **MUST** run the full suite:

```bash
# 1. Unit + Integration Tests (all workspaces)
npm test

# 2. E2E Audit (Ingest -> Search -> Undo -> Verify)
npm run e2e

# 3. Custom Lint (no console.log in library code)
npm run lint

# 4. ESLint (code quality rules)
npm run lint:eslint

# 5. Prettier (formatting check)
npm run format:check
```

If any step fails, you are **forbidden** from merging.

### Writing Tests

- Tests live in `packages/<pkg>/test/`.
- Use Node.js built-in `assert` module.
- Test both happy paths **and** error cases (validation, not-found, etc.).
- Create isolated test directories; clean up in `finally` blocks.
- When testing core classes, create instances directly (`new KnowledgeGraphManager({ basePath: TEST_DIR })`), don't rely on environment variables.

## 4. Coding Standards

### Enforced by Tools
- **ESLint** (`.eslintrc.json`): `no-var`, `eqeqeq`, `prefer-const`, `no-eval`, `no-throw-literal`, etc.
- **Prettier** (`.prettierrc`): Single quotes, 4-space indent, 120 char line width, trailing comma: none.
- **jsconfig.json**: `@ts-check` enabled — add JSDoc types to all public functions.
- **Custom Lint** (`scripts/lint.js`): No `console.log()` in `packages/*/src/`. Use `console.warn()` or `console.error()` for diagnostics.

### Manual Rules
- **Paths:** Never hardcode absolute paths. Use `path.resolve()` or config injection.
- **Process:** Do not use `process.exit()` in library code (`src/`). Only in CLI entry points.
- **Dependencies:** Lock versions in `package.json`. No `*` or `latest`.
- **Error Handling:** Every `catch` block must either re-throw a typed error or log with context. No empty `catch {}`.

## 5. Dependency Injection Pattern

```javascript
// WRONG: importing singletons
const graphManager = require('./graph-manager'); // This is the old pattern

// RIGHT: using the container
const { createContainer } = require('@uks/core');
const { graphManager, vectorManager } = createContainer();

// RIGHT: creating instances directly (for tests)
const { KnowledgeGraphManager } = require('@uks/core');
const gm = new KnowledgeGraphManager({ basePath: '/tmp/test' });
```

## 6. Commit Messages

Follow the **Emoji + Scope** convention:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code restructuring
- `test:` Adding or updating tests
- `chore:` Build, CI, tooling changes

**Example:**
`feat: add JSONPath mapping support to ingest command`

---
*Maintainer: Xiao Fan Ge (The Flame Hashira)*
