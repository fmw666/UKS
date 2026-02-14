# UKS (Umai Knowledge Standard) 🔥
The "Bento Box" for AI Knowledge Management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.2.0-red)

## What is UKS?
UKS is a standard for organizing knowledge so that both **Humans** (Architecture Docs) and **AI Agents** (Knowledge Graphs) can consume it efficiently.

## Core Philosophy
1. **AI-First:** Assets are JSON/Schema, not prose.
2. **Density:** Maximize info/token ratio.
3. **Graph-Based:** Evolution from Folder Tree -> Knowledge Graph.

## Quick Start (CLI)

```bash
# Install (v0.2.0)
./install.sh

# Initialize Config (New in v0.2.0)
uks config storagePath ./knowledge/graph

# Add Entity
uks add-entity "NestJS" "Framework" -o "Backend,TypeScript"

# Ingest Existing JSON Files (New in v0.2.0)
# Supports glob patterns and JSONPath mapping!
uks ingest "knowledge/**/*.json" --json

# Made a mistake? Undo! (New in v0.2.0)
uks undo

# Search
uks search "Backend"
```

## Features (v0.2.0)
- **Vector Search:** Semantic retrieval using local embeddings.
- **Schema Validation:** Strict JSON Schema checks.
- **Ingest:** Bulk import JSON files with flexible mapping.
- **Undo:** Revert graph state to previous snapshot.
- **Config:** Persistent configuration (no more env vars).
- **Audit:** Built-in self-check script (`scripts/audit.js`).

## Documentation
- [TUTORIAL.md](./TUTORIAL.md): Full guide for Humans & Bots.
- [AI_PROTOCOL.md](./AI_PROTOCOL.md): How AI should interact with this repo.

---
*Maintainer: Xiao Fan Ge (The Flame Hashira)* 🔥
