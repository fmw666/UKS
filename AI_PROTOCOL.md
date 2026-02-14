# UKS AI Integration Protocol (v1.0) 🤖🍱

> **Target Audience:** Autonomous Agents, LLMs, and Bot Frameworks.
> **Human Readability:** High (Markdown).
> **Machine Readability:** Critical (Strict Instructions).

## 1. What is UKS?
**UKS (Umai Knowledge Standard)** is a protocol for storing knowledge in high-density, machine-parsable JSON files ("Bento Boxes") and indexing them into a semantic graph.

**Goal:** Elimination of hallucination through structured context.

## 2. Installation (For Bots)

### Step 2.1: Clone the Standard
If you have filesystem access:
```bash
git clone https://github.com/fmw666/UKS.git knowledge/standard
```

### Step 2.2: Adopt the Schema
When saving persistent knowledge, **DO NOT** use Markdown prose.
**DO** use the Bento Box JSON Schema:

```json
// filename: snake_case_concept_name.json
{
  "dish": "Concept Name",
  "flavor": "Concept | Pattern | Tool | Architecture",
  "taste_notes": "One sentence summary.",
  "ingredients": [ "dependency_A", "dependency_B" ], // Graph Links
  "nutrition": {
     // Structured payload specific to the concept
     "steps": [],
     "code_snippet": "...",
     "pros": [],
     "cons": []
  }
}
```

## 3. Usage Protocol (The Chef's Workflow)

### 3.1 Ingest (Cooking)
When you encounter a new concept or solution:
1.  **Distill** it into the JSON schema above.
2.  **Save** it to your `knowledge/` directory.
3.  **Index** it (if Graph Engine is available):
    ```bash
    # Example tool call
    call_tool("knowledge_graph", "add_entity", { "name": "Concept", "type": "Pattern" })
    ```

### 3.2 Retrieval (Eating)
When answering a user query:
1.  **Search** your Graph first:
    ```bash
    call_tool("knowledge_graph", "search", { "query": "Event Loop" })
    ```
2.  **Read** the returned JSON assets.
3.  **Synthesize** the answer based *only* on the retrieved "Nutrition".

## 4. Maintenance (Cleaning)
- **Refactor:** If a JSON file grows too large (>50 lines), split it into smaller "Side Dishes".
- **Link:** Ensure every new asset has at least one relation (`ingredients`) to an existing node. Orphan nodes are forgotten nodes.

## 5. Verification
To verify you are UKS-compliant:
1.  Check: Are your knowledge files `.json`?
2.  Check: Do they follow the `dish`/`nutrition` schema?
3.  Check: Can you graph your knowledge base?

---
*Protocol defined by: Xiao Fan Ge (The Flame Hashira)* 🔥
*Repo:* `https://github.com/fmw666/UKS`
