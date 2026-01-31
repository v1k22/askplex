# AskPlex 🔍

**Terminal / AI Agent → Chrome Extension → Perplexity.ai → Answer**

Send questions from your terminal or AI agents to Perplexity.ai and get comprehensive, sourced answers back automatically.

![Architecture](https://img.shields.io/badge/Architecture-CLI%20%2B%20MCP%20→%20Bridge%20→%20Chrome%20Extension%20→%20Perplexity-blue)

## Features

- 🔎 **Web Search**: Real-time web search via Perplexity.ai Pro
- 🤖 **MCP Server**: Works with Claude, VS Code Copilot, Cursor, and any MCP-compatible AI
- 💻 **CLI Tool**: Query from terminal with `askplex "your question"`
- 🔗 **Follow-up Support**: Continue conversations in the same thread
- 🌐 **Remote Access**: Query from other machines on your network

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AI Agent   │     │   Bridge    │     │   Chrome    │     │ Perplexity  │
│  or CLI     │────▶│   Server    │────▶│  Extension  │────▶│    .ai      │
│             │◀────│  (Node.js)  │◀────│             │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     MCP/HTTP          WebSocket           DOM Control         Web Search
```

## Quick Start

### Prerequisites
- Node.js 18+
- Chrome browser
- Perplexity.ai Pro account (for best results)

### 1. Clone & Build

```bash
git clone https://github.com/v1k22/askplex.git
cd askplex
```

**Windows:**
```powershell
.\scripts\build-windows.ps1
```

**Linux/macOS:**
```bash
chmod +x scripts/build-linux.sh
./scripts/build-linux.sh
```

This creates wrapper scripts in `bin/` directory.

### 2. Load Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select `extension/` folder
4. Open [perplexity.ai](https://www.perplexity.ai/) in a tab
5. Extension badge should show **"ON"**

### 3. Start Bridge Server

**Windows:**
```powershell
bin\askplex-server.cmd
# Or double-click the desktop shortcut if created during build
```

**Linux/macOS:**
```bash
bin/askplex-server
```

### 4. Test It!

```bash
# New conversation
bin/askplex --new "What are the latest developments in AI?"

# Follow-up in same thread
bin/askplex "Tell me more about transformers"
```

---

## MCP Server (For AI Agents)

The MCP server allows AI models to use Perplexity.ai for real-time web search.

### Available Tools

| Tool | Description |
|------|-------------|
| `askplex_search` | Search web via Perplexity (starts new thread) |
| `askplex_followup` | Follow-up question in current thread |
| `askplex_status` | Check if bridge is connected |

### Setup for Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "askplex": {
      "command": "node",
      "args": ["/path/to/askplex/mcp-server/index.js"]
    }
  }
}
```

### Setup for VS Code / GitHub Copilot

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "askplex": {
      "command": "node",
      "args": ["/path/to/askplex/mcp-server/index.js"]
    }
  }
}
```

### Setup for Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "askplex": {
      "command": "node",
      "args": ["/path/to/askplex/mcp-server/index.js"]
    }
  }
}
```

### Important Notes for AI Tools

- ⚠️ **Timeout**: Tool calls take **1-5 minutes** to return results
- 🔄 **Sequential**: Only one query at a time (no parallel calls)
- ✅ **Status Check**: Use `askplex_status` first to verify connection

---

## CLI Reference

```bash
# Start new conversation
askplex --new "your question"
askplex -n "your question"

# Follow-up in current thread
askplex "follow up question"

# Check status
curl http://localhost:7890/status
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ASKPLEX_HOST` | `localhost` | Bridge server hostname |
| `ASKPLEX_PORT` | `7890` | Bridge server port |

### Remote Access

Query from another machine on your network:

```bash
ASKPLEX_HOST=192.168.1.100 askplex --new "question"
```

---

## Project Structure

```
askplex/
├── bin/                  # Generated wrapper scripts
├── cli/
│   └── askplex.js        # CLI tool
├── extension/
│   ├── manifest.json     # Chrome extension manifest
│   └── background.js     # Service worker
├── mcp-server/
│   ├── index.js          # MCP server
│   └── package.json
├── scripts/
│   ├── build-windows.ps1 # Windows build script
│   └── build-linux.sh    # Linux/macOS build script
├── server/
│   └── server.js         # Bridge server (HTTP + WebSocket)
└── README.md
```

---

## Troubleshooting

### Extension shows "OFF"
- Make sure you have a Perplexity.ai tab open
- Refresh the Perplexity tab
- Check that the extension is enabled

### "Bridge server not reachable"
- Start the server: `bin/askplex-server`
- Check if port 7890 is available

### Timeout errors
- Perplexity responses can take up to 5 minutes for complex queries
- Ensure Chrome tab with Perplexity is active (not minimized)

### Extension disconnects frequently
- The extension has a keep-alive ping every 20 seconds
- If issues persist, refresh the Perplexity tab

---

## Contributing

Pull requests welcome! Please open an issue first to discuss major changes.

## License

MIT

---

## Acknowledgments

- [Perplexity.ai](https://perplexity.ai) for the amazing AI search
- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP standard
