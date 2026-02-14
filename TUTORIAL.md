# UKS Bootcamp: How to Index & Structure 🏫

> *"Don't just store data. Build a brain."*

## 1. Directory Structure (The Kitchen)
Keep your knowledge organized by domain.
**Recommended Layout:**

```text
knowledge/
├── meta/               # Protocols, Standards (e.g., knowledge_system.json)
├── tech/               # Technologies (e.g., node/, python/, docker/)
├── architecture/       # Patterns (e.g., ddd/, microservices/)
├── business/           # Domain logic (e.g., user_management/, billing/)
└── graph/              # (Generated) graph-default.jsonl
```

## 2. Creating a Knowledge Asset (Cooking)

### Step 1: Identify the Concept
- Is it a **Tool**? (e.g., Docker)
- Is it a **Pattern**? (e.g., Singleton)
- Is it a **Principle**? (e.g., DRY)

### Step 2: Create the JSON File
Use the **Snake Case** naming convention: `knowledge/architecture/singleton_pattern.json`.
Copy this template:

```json
{
  "dish": "Singleton Pattern",
  "flavor": "Pattern",
  "taste_notes": "Ensure a class has only one instance and provide a global point of access to it.",
  "ingredients": [
    "object_oriented_programming",  // Link to other concepts!
    "global_state"
  ],
  "nutrition": {
    "implementation": "private static instance...",
    "pros": ["Controlled access"],
    "cons": ["Hard to test", "Hidden dependencies"]
  }
}
```

### Step 3: Indexing into the Graph (Serving)
Once the file is saved, you must **tell the Graph Engine** about it.

**Command:**
```bash
# Add the entity
node skills/knowledge-graph/index.js add-entity "Singleton Pattern" "Pattern" -o "One instance rule"

# Add relationships (The most important part!)
node skills/knowledge-graph/index.js link "Singleton Pattern" "implements" "Object Oriented Programming"
node skills/knowledge-graph/index.js link "Database Connection" "uses" "Singleton Pattern"
```

## 3. The Feedback Loop
1.  **Read:** When user asks about "Database", search the graph: `search "Database"`.
2.  **Discover:** Graph returns `Singleton Pattern` as a dependency.
3.  **Synthesize:** Explain Database using the Singleton context.
