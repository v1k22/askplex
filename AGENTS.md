# AskPlex

Terminal → Chrome Extension → Perplexity.ai → Answer back to terminal

## Components
- **CLI**: `cli/askplex.js` - Send questions from terminal
- **Server**: `server/server.js` - Bridge between CLI and extension
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
