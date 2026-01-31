// AskPlex Chrome Extension - Background Service Worker
// Connects to local bridge server via WebSocket

const BRIDGE_SERVER_URL = 'ws://localhost:7890';
let socket = null;
let isConnected = false;
let reconnectInterval = null;
let keepAliveInterval = null;

// State tracking for popup UI
let currentState = {
  isProcessing: false,
  currentQuery: null,
  lastAnswer: null,
  lastError: null
};

// Keep-alive mechanism to prevent service worker from sleeping
function startKeepAlive() {
  stopKeepAlive(); // Clear any existing
  
  // Send ping every 20 seconds to keep connection alive
  keepAliveInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }));
      console.log('[AskPlex] Keep-alive ping sent');
    }
  }, 20000);
  
  console.log('[AskPlex] Keep-alive started');
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Broadcast state update to popup
function broadcastState(stateUpdate) {
  chrome.runtime.sendMessage({ action: 'stateUpdate', state: stateUpdate }).catch(() => {
    // Popup might not be open, ignore error
  });
}

// Connect to the bridge server
function connectToServer() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('[AskPlex] Already connected');
    return;
  }

  console.log('[AskPlex] Connecting to bridge server...');
  
  try {
    socket = new WebSocket(BRIDGE_SERVER_URL);

    socket.onopen = () => {
      console.log('[AskPlex] Connected to bridge server');
      isConnected = true;
      updateBadge('ON', '#4CAF50');
      broadcastState({ type: 'connected' });
      
      // Clear reconnect interval if exists
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      
      // Start keep-alive ping to prevent service worker from sleeping
      startKeepAlive();
    };

    socket.onmessage = (event) => {
      console.log('[AskPlex] Received message:', event.data);
      handleMessage(event.data);
    };

    socket.onclose = () => {
      console.log('[AskPlex] Disconnected from bridge server');
      isConnected = false;
      updateBadge('OFF', '#F44336');
      broadcastState({ type: 'disconnected' });
      stopKeepAlive();
      
      // Try to reconnect every 5 seconds
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('[AskPlex] Attempting to reconnect...');
          connectToServer();
        }, 5000);
      }
    };

    socket.onerror = (error) => {
      console.error('[AskPlex] WebSocket error:', error);
      updateBadge('ERR', '#FF9800');
    };
  } catch (error) {
    console.error('[AskPlex] Failed to connect:', error);
    updateBadge('ERR', '#FF9800');
  }
}

// Handle incoming messages from bridge server
async function handleMessage(data) {
  try {
    const message = JSON.parse(data);
    console.log('[AskPlex] Parsed message:', message);

    if (message.type === 'query') {
      // Update state and broadcast
      currentState.isProcessing = true;
      currentState.currentQuery = message.query;
      broadcastState({ type: 'query_received', query: message.query });
      updateBadge('...', '#FF9800');
      
      try {
        // Find perplexity.ai tab
        const tab = await findOrCreatePerplexityTab();
        
        if (!tab) {
          throw new Error('Could not access perplexity.ai tab');
        }

        console.log('[AskPlex] Found tab:', tab.id, tab.url);
        
        const isThreadPage = tab.url.includes('/search/') || tab.url.includes('/thread/');
        const isNewQuery = message.newThread === true; // Flag from CLI
        
        // Only navigate to home if explicitly requested as new thread
        if (isNewQuery && isThreadPage) {
          console.log('[AskPlex] New thread requested, navigating to home...');
          await chrome.tabs.update(tab.id, { url: 'https://www.perplexity.ai/' });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (isThreadPage) {
          console.log('[AskPlex] Staying on thread page for follow-up question');
        }
        
        broadcastState({ type: 'entering_text' });
        
        // Step 1: Enter text using executeScript
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (text) => {
            const inputField = document.getElementById('ask-input');
            if (!inputField) {
              return { success: false, error: 'Input field not found' };
            }
            
            // Focus the input field
            inputField.focus();
            
            // Select all existing content first
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputField);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Create a DataTransfer object with our text
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', text);
            
            // Create and dispatch paste event
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dataTransfer
            });
            
            inputField.dispatchEvent(pasteEvent);
            return { success: true };
          },
          args: [message.query]
        });
        
        console.log('[AskPlex] Text entry dispatched, waiting 2 seconds...');
        
        // Wait 2 seconds for text to be processed by Lexical
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        broadcastState({ type: 'submitting' });
        console.log('[AskPlex] Clicking submit button...');
        
        // Step 2: Click submit button
        const submitResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Helper function to simulate a real click
            function simulateRealClick(element) {
              const rect = element.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              
              element.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, cancelable: true, view: window,
                clientX: centerX, clientY: centerY
              }));
              element.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true, cancelable: true, view: window,
                clientX: centerX, clientY: centerY
              }));
              element.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true, view: window,
                clientX: centerX, clientY: centerY
              }));
            }
            
            const submitBtn = document.querySelector('button[aria-label="Submit"]');
            if (submitBtn && !submitBtn.disabled) {
              simulateRealClick(submitBtn);
              return { success: true };
            }
            return { success: false, error: 'Submit button not found or disabled' };
          }
        });
        
        console.log('[AskPlex] Submit result:', submitResult[0]?.result);
        
        if (!submitResult[0]?.result?.success) {
          throw new Error('Failed to submit: ' + (submitResult[0]?.result?.error || 'Unknown error'));
        }
        
        broadcastState({ type: 'waiting_answer' });
        
        // Wait 60 seconds for Perplexity to generate the answer
        console.log('[AskPlex] Waiting 60 seconds for answer to generate...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // Step 3: Read the latest answer
        const answerResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Get ALL markdown content elements and take the LAST one (most recent answer)
            const allMarkdownContents = document.querySelectorAll('[id^="markdown-content-"]');
            if (allMarkdownContents.length === 0) {
              return { found: false, error: 'No answer found' };
            }
            
            // Get the last (most recent) answer
            const markdownContent = allMarkdownContents[allMarkdownContents.length - 1];
            const text = markdownContent.textContent.trim();
            
            return { found: true, text, answerCount: allMarkdownContents.length };
          }
        });
        
        const result = answerResult[0]?.result;
        console.log('[AskPlex] Answer result:', result?.found, 'count:', result?.answerCount);
        
        let finalAnswer = null;
        if (result?.found && result.text) {
          finalAnswer = result.text;
        }
        
        if (finalAnswer) {
          const response = {
            type: 'response',
            id: message.id,
            answer: finalAnswer,
            success: true
          };
          
          currentState.isProcessing = false;
          currentState.lastAnswer = finalAnswer;
          currentState.lastError = null;
          broadcastState({ type: 'answer_received', answer: finalAnswer });
          updateBadge('ON', '#4CAF50');
          
          socket.send(JSON.stringify(response));
        } else {
          throw new Error('Timeout waiting for answer');
        }
        
      } catch (error) {
        console.error('[AskPlex] Error processing query:', error);
        
        currentState.isProcessing = false;
        currentState.lastError = error.message;
        broadcastState({ type: 'error', error: error.message });
        updateBadge('ON', '#4CAF50');
        
        const errorResponse = {
          type: 'response',
          id: message.id,
          answer: null,
          success: false,
          error: error.message
        };
        socket.send(JSON.stringify(errorResponse));
      }
    }
  } catch (error) {
    console.error('[AskPlex] Error handling message:', error);
    
    const errorResponse = {
      type: 'response',
      id: 'unknown',
      answer: null,
      success: false,
      error: error.message
    };
    socket.send(JSON.stringify(errorResponse));
  }
}

// Promise wrapper for chrome.tabs.sendMessage
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Ensure content script is injected into the tab
async function ensureContentScriptInjected(tabId) {
  try {
    // Try to ping the content script
    await sendMessageToTab(tabId, { type: 'ping' });
    console.log('[AskPlex] Content script already injected');
  } catch (error) {
    console.log('[AskPlex] Injecting content script...');
    // Content script not present, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    // Wait a bit for script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[AskPlex] Content script injected');
  }
}

// Find existing perplexity.ai tab or create new one
async function findOrCreatePerplexityTab() {
  // Search for existing perplexity.ai tab
  const tabs = await chrome.tabs.query({ url: 'https://www.perplexity.ai/*' });
  
  if (tabs.length > 0) {
    // Use existing tab
    console.log('[AskPlex] Found existing perplexity.ai tab');
    return tabs[0];
  }
  
  // Create new tab
  console.log('[AskPlex] Creating new perplexity.ai tab');
  const tab = await chrome.tabs.create({
    url: 'https://www.perplexity.ai/',
    active: false // Don't switch to it
  });
  
  // Wait for tab to load
  await new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
  
  // Wait a bit more for page to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return tab;
}

// Update extension badge
function updateBadge(text, color) {
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// Initialize connection when service worker starts
connectToServer();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ 
      connected: isConnected,
      isProcessing: currentState.isProcessing,
      currentQuery: currentState.currentQuery,
      lastAnswer: currentState.lastAnswer,
      lastError: currentState.lastError
    });
  } else if (request.action === 'reconnect') {
    connectToServer();
    sendResponse({ status: 'reconnecting' });
  }
  return true;
});

console.log('[AskPlex] Background service worker initialized');
