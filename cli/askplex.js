#!/usr/bin/env node

// AskPlex CLI - Send queries to AskPlex Chrome extension via bridge server

const http = require('http');

// Allow remote host via environment variable or default to localhost
const BRIDGE_HOST = process.env.ASKPLEX_HOST || 'localhost';
const BRIDGE_PORT = process.env.ASKPLEX_PORT || '7890';
const BRIDGE_URL = `http://${BRIDGE_HOST}:${BRIDGE_PORT}/ask`;

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let newThread = false;
  const queryParts = [];
  
  for (const arg of args) {
    if (arg === '--new' || arg === '-n') {
      newThread = true;
    } else {
      queryParts.push(arg);
    }
  }
  
  return { query: queryParts.join(' '), newThread };
}

// Get query from command line arguments or stdin
async function getQuery() {
  const { query, newThread } = parseArgs();
  
  // If arguments provided, return them
  if (query.length > 0) {
    return { query, newThread };
  }
  
  // Otherwise, read from stdin (for piping)
  return new Promise((resolve) => {
    let data = '';
    
    // Check if stdin has data
    if (process.stdin.isTTY) {
      console.error('Usage: askplex "your question here"');
      console.error('       askplex --new "start a new conversation"');
      console.error('       askplex "follow up question" (stays in thread)');
      console.error('   or: cat file.log | askplex');
      process.exit(1);
    }
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve({ query: data.trim(), newThread });
    });
  });
}

// Send query to bridge server
function sendQuery(query, newThread = false) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, newThread });
    
    const url = new URL(BRIDGE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.error('⏳ Sending query to AskPlex...\n');

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Cannot connect to bridge server. Make sure to run: cd server && npm start'));
      } else {
        reject(error);
      }
    });

    // Set timeout (10 minutes)
    req.setTimeout(600000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Main
async function main() {
  try {
    const { query, newThread } = await getQuery();
    
    if (!query) {
      console.error('Error: No query provided');
      process.exit(1);
    }

    const modeText = newThread ? ' (new thread)' : ' (follow-up)';
    console.error(`📤 Query${modeText}: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"\n`);

    const response = await sendQuery(query, newThread);

    if (response.success) {
      console.log('✅ Answer received:\n');
      console.log(response.answer);
    } else {
      console.error('❌ Error:', response.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
