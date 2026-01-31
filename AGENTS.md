# AskPlex

Terminal / AI Agent → Chrome Extension → Perplexity.ai → Answer back

## Components
- **MCP Server**: `mcp-server/` - Model Context Protocol server for AI agents
- **CLI**: `cli/askplex.js` - Send questions from terminal
- **Server**: `server/server.js` - Bridge between clients and extension
- **Extension**: `extension/` - Chrome extension that controls Perplexity.ai

## Quick Start

### 1. Start Server
```powershell
Start-Process powershell -WindowStyle Minimized -ArgumentList "-NoExit", "-Command", "cd c:\Users\bdhandha\Downloads\web-ai-terminal\server; node server.js"
```

### 2. Chrome Setup
- Open Chrome, go to `chrome://extensions`
- Enable Developer mode
- Load unpacked → select `extension/` folder
- Open `https://www.perplexity.ai/` in a tab
- Extension badge should show "ON"

### 3. Ask Questions
```powershell
# New conversation
node cli/askplex.js --new "your question"

# Follow-up (stays in thread)
node cli/askplex.js "follow up question"
```

## Remote Access
From another machine on same network:
```bash
ASKPLEX_HOST=192.168.1.3 node askplex.js "question"
```

## Flags
- `--new` or `-n`: Start new conversation thread
- No flag: Continue in current thread (follow-up)

---

## MCP Server (For AI Agents)

### Setup for Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "askplex": {
      "command": "node",
      "args": ["C:/Users/bdhandha/Downloads/web-ai-terminal/mcp-server/index.js"]
    }
  }
}
```

### Setup for VS Code / Cursor / Other MCP Clients
Add to your MCP settings:
```json
{
  "askplex": {
    "command": "node", 
    "args": ["C:/Users/bdhandha/Downloads/web-ai-terminal/mcp-server/index.js"]
  }
}
```

### Available Tools
| Tool | Description |
|------|-------------|
| `askplex_search` | Search web via Perplexity (new thread) |
| `askplex_followup` | Follow-up question in current thread |
| `askplex_status` | Check if bridge is connected |

### Requirements
- Bridge server must be running (`node server/server.js`)
- Chrome extension must be connected to Perplexity.ai tab

---

Note:
- Imagine you have unlimited access to search
- Whenever use asks for realtime data or query which requires search result use this without hesitation
- It takes max 5 min for command to return full answer
- Ask 1 question at a time, NO parallel tool calling. MUST REPEAT, NO Parallel tool calling.
- MUST use >5min timeout (for AI tools)

Planning:
- If user wants to do Deep Research on any topic follow steps
    - First plan it by dividing user query into small phases
    - for each phase use askplex to find answer
    - one query at a time
    - once you collect answer for each phase you yourself do deep research
    - final answer should be concise and accurate