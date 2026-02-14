const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Import from CLI package (Monorepo internal reference)
const graphManager = require("../cli/src/graph-manager");
const vectorManager = require("../cli/src/vector-manager");

// Initialize MCP Server
const server = new Server(
  {
    name: "uks-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define Tools
const TOOLS = [
  {
    name: "search_knowledge",
    description: "Search the knowledge graph for entities and relations.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (keywords or semantic description)",
        },
        semantic: {
          type: "boolean",
          description: "Use vector/semantic search (slower but smarter)",
          default: false,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_graph",
    description: "Get the entire graph or specific context (use carefully for large graphs).",
    inputSchema: {
      type: "object",
      properties: {
        context: {
          type: "string",
          description: "Graph context/namespace",
          default: "default",
        },
      },
    },
  },
  {
    name: "add_entity",
    description: "Add a new entity to the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the entity" },
        type: { type: "string", description: "Type of the entity (e.g., Concept, Person)" },
        observations: {
          type: "array",
          items: { type: "string" },
          description: "List of observations/facts about the entity",
        },
      },
      required: ["name", "type"],
    },
  },
  {
    name: "add_relation",
    description: "Link two entities in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source entity name or ID" },
        relation: { type: "string", description: "Relationship type (e.g., depends_on)" },
        to: { type: "string", description: "Target entity name or ID" },
      },
      required: ["from", "relation", "to"],
    },
  },
];

// List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_knowledge": {
        const { query, semantic } = args;
        let result;
        if (semantic) {
            // Check if vectorManager is available/initialized
            try {
                // We might need to ensure embeddings exist first?
                // vectorManager usually handles lazy loading, but let's be safe
                result = await vectorManager.search(query);
            } catch (e) {
                return {
                    content: [{ type: "text", text: `Semantic search failed: ${e.message}. Falling back to keyword search.` }],
                    isError: true
                }
            }
        } else {
            result = await graphManager.search(query);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "read_graph": {
        const { context } = args;
        const graph = await graphManager.getAll(context);
        return {
          content: [{ type: "text", text: JSON.stringify(graph, null, 2) }],
        };
      }

      case "add_entity": {
        const { name, type, observations } = args;
        await graphManager.addEntity({ name, entityType: type, observations });
        return {
          content: [{ type: "text", text: `Added entity: ${name} (${type})` }],
        };
      }

      case "add_relation": {
        const { from, relation, to } = args;
        await graphManager.addRelation({ from, relationType: relation, to });
        return {
          content: [{ type: "text", text: `Linked: ${from} --${relation}--> ${to}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UKS MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
