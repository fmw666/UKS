// @ts-check
'use strict';

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Bootstrap via DI container — no singletons
const { createContainer, UksError, validator } = require("@uks/core");
const { graphManager, vectorManager } = createContainer();

// Initialize MCP Server
const server = new Server(
    {
        name: "uks-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// --- Tool Definitions ---
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
                name: { type: "string", description: "Name of the entity", maxLength: 500 },
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

// --- List Tools Handler ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// --- Call Tool Handler ---
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    /** @type {Record<string, any>} */
    const a = /** @type {any} */ (args) || {};

    try {
        switch (name) {
            case "search_knowledge": {
                const query = /** @type {string} */ (validator.requireString(a.query, 'query'));
                const semantic = !!a.semantic;
                let result;
                if (semantic) {
                    try {
                        result = await vectorManager.search(query);
                    } catch (e) {
                        // Fallback to keyword search on semantic failure
                        result = await graphManager.search(query);
                        return {
                            content: [{
                                type: "text",
                                text: `Semantic search unavailable (${/** @type {Error} */ (e).message}), fell back to keyword search.\n\n${JSON.stringify(result, null, 2)}`
                            }],
                        };
                    }
                } else {
                    result = await graphManager.search(query);
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }

            case "read_graph": {
                const context = /** @type {string} */ (a.context || 'default');
                validator.validateContext(context);
                const graph = await graphManager.getAll(context);
                return {
                    content: [{ type: "text", text: JSON.stringify(graph, null, 2) }],
                };
            }

            case "add_entity": {
                const entityName = /** @type {string} */ (validator.sanitizeString(a.name, 'name', 500));
                const entityType = /** @type {string} */ (validator.requireString(a.type, 'type'));
                const observations = validator.validateObservations(a.observations);
                const id = await graphManager.addEntity({
                    name: entityName,
                    entityType,
                    observations
                });
                return {
                    content: [{ type: "text", text: `Added entity: ${entityName} (${entityType}) [${id}]` }],
                };
            }

            case "add_relation": {
                const from = /** @type {string} */ (validator.sanitizeString(a.from, 'from', 500));
                const to = /** @type {string} */ (validator.sanitizeString(a.to, 'to', 500));
                const relation = /** @type {string} */ (validator.requireString(a.relation, 'relation'));
                await graphManager.addRelation({
                    from,
                    relationType: relation,
                    to
                });
                return {
                    content: [{ type: "text", text: `Linked: ${from} --${relation}--> ${to}` }],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const message = error instanceof UksError
            ? `[${error.code}] ${error.message}`
            : `Error: ${/** @type {Error} */ (error).message}`;
        return {
            content: [{ type: "text", text: message }],
            isError: true,
        };
    }
});

// --- Start Server ---
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("UKS MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
