import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BRIDGE_HOST = process.env.ASKPLEX_HOST || "localhost";
const BRIDGE_PORT = process.env.ASKPLEX_PORT || 7890;
const BRIDGE_URL = `http://${BRIDGE_HOST}:${BRIDGE_PORT}`;

// Tool definitions
const tools = [
  {
    name: "askplex_search",
    description: `Search the web using Perplexity.ai Pro. Returns comprehensive, sourced answers.

USE THIS TOOL FOR:
- Current events, news, real-time information
- Facts that may have changed since your training
- Research requiring multiple sources
- Any question where up-to-date accuracy matters

⚠️ TIMEOUT: This tool takes 1-5 MINUTES to return results. You MUST wait for the full response. Do NOT timeout early.
Starts a new conversation thread.`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The question to search for. Be specific and detailed for best results.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "askplex_followup",
    description: `Ask a follow-up question in the current Perplexity thread.

USE THIS TOOL FOR:
- Drilling deeper into a previous search result
- Asking clarifying questions about the last answer
- Continuing a research thread

⚠️ TIMEOUT: This tool takes 1-5 MINUTES to return results. You MUST wait for the full response. Do NOT timeout early.
Only works after askplex_search has been called.`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The follow-up question to ask.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "askplex_status",
    description: `Check if the AskPlex bridge server and Chrome extension are connected and ready.

USE THIS TOOL FOR:
- Verifying the system is ready before making searches
- Debugging connection issues

Returns immediately (no delay).`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Send query to bridge server
async function sendQuery(query, newThread = true) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout

  try {
    const response = await fetch(`${BRIDGE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, newThread }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bridge error (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.answer || data.error || "No response received";
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Request timed out after 5 minutes");
    }
    throw error;
  }
}

// Check bridge status
async function checkStatus() {
  try {
    const response = await fetch(`${BRIDGE_URL}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      connected: data.extensionConnected || false,
      server: true,
      extension: data.extensionConnected || false,
      message: data.extensionConnected
        ? "Ready - Bridge server and Chrome extension connected"
        : "Bridge server running but Chrome extension not connected",
    };
  } catch (error) {
    return {
      connected: false,
      server: false,
      extension: false,
      message: `Bridge server not reachable at ${BRIDGE_URL}. Start it with: node server/server.js`,
      error: error.message,
    };
  }
}

// Create MCP server
const server = new Server(
  {
    name: "askplex",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "askplex_search": {
        const { query } = args;
        if (!query) {
          return {
            content: [{ type: "text", text: "Error: query parameter is required" }],
            isError: true,
          };
        }

        const answer = await sendQuery(query, true);
        return {
          content: [
            {
              type: "text",
              text: `## Perplexity Search Results\n\n**Query:** ${query}\n\n---\n\n${answer}`,
            },
          ],
        };
      }

      case "askplex_followup": {
        const { query } = args;
        if (!query) {
          return {
            content: [{ type: "text", text: "Error: query parameter is required" }],
            isError: true,
          };
        }

        const answer = await sendQuery(query, false);
        return {
          content: [
            {
              type: "text",
              text: `## Follow-up Results\n\n**Query:** ${query}\n\n---\n\n${answer}`,
            },
          ],
        };
      }

      case "askplex_status": {
        const status = await checkStatus();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AskPlex MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
