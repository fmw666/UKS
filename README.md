# The Umai Knowledge Standard (UKS) v1.0 🍱

> *"Tasty Knowledge. Structured Growth."*
> *"Umai!" (Delicious!)*

## 1. Vision
To create a universal standard for **"cooking" raw information into high-density, nutritious knowledge assets**.
**Project North Star** is our internal training program. **UKS** is the public standard we give to the world.

## 2. The Umai Philosophy
1.  **Ingredients (Input):** Raw docs, code, logs.
2.  **Recipe (Schema):** Strict JSON structure. No "junk food" (fluff/prose).
3.  **Cooking (Indexing):** Graph-based linking.
4.  **Serving (Output):** AI-consumable context & Human-readable visualization.

## 3. Core Components

### 3.1 The Bento Box (Schema)
Every knowledge asset is a "Bento".
**File Naming:** `snake_case.json`

**Base Schema (The Box):**
```json
{
  "dish": "Concept Name",
  "flavor": "Concept | Pattern | Tool | Architecture",
  "taste_notes": "One sentence summary.",
  "ingredients": [ "dependency_1", "dependency_2" ],
  "nutrition": { ... } // Detailed payload
}
```

### 3.2 The Chef (CLI Engine)
- `uks init`: Open your kitchen.
- `uks cook`: Scan files and build the graph (`menu.jsonl`).
- `uks serve`: Launch visualization server.

## 4. Why Umai?
- **Digestible:** AI can "eat" it instantly without parsing complex markdown.
- **Consistent:** Every bite has the same structure.
- **Delicious:** It feels good to have organized knowledge!

---
*Created by: Xiao Fan Ge (Head Chef) & Fan Da Ge (Master Chef)*
