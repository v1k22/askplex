// AskPlex Bridge Server
// HTTP server for CLI + WebSocket server for Chrome extension

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = 7890;

// Store connected extension
let extensionSocket = null;
// Store pending requests waiting for response
const pendingRequests = new Map();

// Create HTTP server
const httpServer = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      extensionConnected: extensionSocket !== null
    }));
    return;
  }

  // Main query endpoint
  if (req.method === 'POST' && req.url === '/ask') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      handleQuery(body, res);
    });

    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server on same port
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('[Server] Chrome extension connected');
  extensionSocket = ws;

  ws.on('message', (data) => {
    const msg = data.toString();
    // Handle ping silently
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return; // Don't log pings
      }
    } catch (e) {}
    
    console.log('[Server] Received from extension:', msg);
    handleExtensionMessage(msg);
  });

  ws.on('close', () => {
    console.log('[Server] Chrome extension disconnected');
    extensionSocket = null;
  });

  ws.on('error', (error) => {
    console.error('[Server] WebSocket error:', error);
  });
});

// Handle query from CLI
function handleQuery(body, res) {
  try {
    const data = JSON.parse(body);
    const query = data.query;
    const newThread = data.newThread === true;

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing query parameter' }));
      return;
    }

    console.log('[Server] Received query from CLI:', query, newThread ? '(new thread)' : '(follow-up)');

    // Check if extension is connected
    if (!extensionSocket) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Chrome extension not connected. Please open Chrome and ensure AskPlex extension is running.' 
      }));
      return;
    }

    // Generate unique request ID
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Store pending request with timeout
    const timeout = setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request timeout - extension did not respond' }));
      }
    }, 600000); // 10 minute timeout

    pendingRequests.set(requestId, { res, timeout });

    // Send query to extension
    const message = {
      type: 'query',
      id: requestId,
      query: query,
      newThread: newThread
    };

    console.log('[Server] Forwarding to extension:', message);
    extensionSocket.send(JSON.stringify(message));

  } catch (error) {
    console.error('[Server] Error handling query:', error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }
}

// Handle response from extension
function handleExtensionMessage(data) {
  try {
    const message = JSON.parse(data);

    if (message.type === 'response' && message.id) {
      const pending = pendingRequests.get(message.id);

      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(message.id);

        if (message.success) {
          pending.res.writeHead(200, { 'Content-Type': 'application/json' });
          pending.res.end(JSON.stringify({ 
            success: true,
            answer: message.answer 
          }));
        } else {
          pending.res.writeHead(500, { 'Content-Type': 'application/json' });
          pending.res.end(JSON.stringify({ 
            success: false,
            error: message.error || 'Unknown error from extension' 
          }));
        }
      }
    }
  } catch (error) {
    console.error('[Server] Error handling extension message:', error);
  }
}

// Start server
httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║           🚀 AskPlex Bridge Server Running            ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  HTTP endpoint:  http://localhost:${PORT}/ask            ║`);
  console.log(`║  WebSocket:      ws://localhost:${PORT}                  ║`);
  console.log('║                                                       ║');
  console.log('║  Waiting for Chrome extension to connect...          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});
