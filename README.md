# AskPlex 🚀

Send terminal queries to Perplexity.ai via Chrome extension and get answers back!

## Architecture

```
Terminal (CLI) ──HTTP──▶ Bridge Server ◀──WebSocket──▶ Chrome Extension ──▶ Perplexity.ai
```

## Setup Instructions

### 1. Install Bridge Server Dependencies

```bash
cd server
npm install
```

### 2. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project

### 3. Start the Bridge Server

```bash
cd server
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║           🚀 AskPlex Bridge Server Running            ║
╠═══════════════════════════════════════════════════════╣
║  HTTP endpoint:  http://localhost:7890/ask            ║
║  WebSocket:      ws://localhost:7890                  ║
║  Waiting for Chrome extension to connect...          ║
╚═══════════════════════════════════════════════════════╝
```

### 4. Verify Extension Connection

- Check the AskPlex extension icon in Chrome - it should show a green "ON" badge
- Click the icon to see connection status

### 5. Test from Terminal

```bash
# Direct query
node cli/askplex.js "what is 2+2?"

# Or with piping
echo "what is 2+2?" | node cli/askplex.js
```

Expected output:
```
⏳ Sending query to AskPlex...

📤 Query: "what is 2+2?"

✅ Answer received:

Hey, its me. answer is 4.
```

## Making CLI Globally Available (Optional)

```bash
cd cli
npm link
```

Then you can use from anywhere:
```bash
askplex "your question here"
```

## Project Structure

```
web-ai-terminal/
├── extension/           # Chrome Extension
│   ├── manifest.json    # Extension manifest
│   ├── background.js    # Service worker (WebSocket client)
│   ├── popup.html       # Extension popup UI
│   └── popup.js         # Popup logic
├── server/              # Bridge Server
│   ├── package.json
│   └── server.js        # HTTP + WebSocket server
├── cli/                 # Command Line Tool
│   ├── package.json
│   └── askplex.js       # CLI entry point
└── README.md
```

## Next Steps

- [ ] Integrate with actual Perplexity.ai (inject into page, scrape response)
- [ ] Add authentication/session handling
- [ ] Support for follow-up questions
- [ ] Auto-execute terminal commands from AI response
