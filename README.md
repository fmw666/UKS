# UKS (Umai Knowledge Standard) 🍱🔥

> **"Umai!" (Delicious!)** — *Kyojuro Rengoku*

The **Bento Box** for AI Knowledge Management. A high-density, nutritious standard for feeding Knowledge Graphs to AI Agents.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.2.0-red)
![Taste](https://img.shields.io/badge/taste-Delicious-orange)

## 🍱 What is UKS?
Most documentation is like a messy buffet — hard for AI to digest.
**UKS** packs knowledge into **Bento Boxes**: structured, schema-validated JSON units that are high in "Information Density" (Nutrition) and low in token waste.

It serves two masters:
1.  **Humans:** Who enjoy the architecture and clarity.
2.  **AI Agents:** Who devour the JSON schemas and Graph relations.

## 🔥 Core Philosophy (The Flame Breathing)
1.  **AI-First (The Ingredients):** JSON/Schema over prose. Data must be machine-readable first.
2.  **Density (Nutrition):** Maximize info/token ratio. Don't feed AI empty calories (fluff words).
3.  **Graph-Based (The Menu):** Evolution from Folder Tree -> Knowledge Graph (Nodes & Edges).

## 🥢 Quick Start (The Chopsticks)

```bash
# Install (v0.2.0)
./install.sh

# Initialize Kitchen (Config)
uks config storagePath ./knowledge/graph

# Prepare a Dish (Add Entity)
uks add-entity "NestJS" "Framework" -o "Backend,TypeScript"

# Devour Existing Knowledge (Ingest)
# Supports bulk consumption of JSON files!
uks ingest "knowledge/**/*.json" --json

# Regret that bite? (Undo)
uks undo

# Find the flavor (Semantic Search)
uks search "Backend" --semantic
```

## 📜 Features (The Menu)
- **🧠 Vector Intelligence:** Local embeddings (`@xenova/transformers`) give the system a sense of "taste" (Semantic Search).
- **🛡️ Schema Validation:** Strict hygiene checks (`ajv`). No spoiled food allowed!
- **📥 Ingest Engine:** Bulk import machinery.
- **⏪ Time Reversal (Undo):** Atomic batch updates with rollback.
- **⚔️ Nichirin Audit:** Built-in self-check script (`scripts/audit.js`) to ensure the blade is sharp.

## Documentation
- [TUTORIAL.md](./TUTORIAL.md): How to cook and eat.
- [AI_PROTOCOL.md](./AI_PROTOCOL.md): Table manners for AI Bots.

---
*Maintained by Xiao Fan Ge (The Flame Hashira)* 🔥
*"Set your heart ablaze!"*
