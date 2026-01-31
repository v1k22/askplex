// AskPlex Content Script - Injected into perplexity.ai
// This is a minimal content script for the manifest requirement
// Most logic now runs via chrome.scripting.executeScript from popup

console.log('[AskPlex Content] Script loaded on perplexity.ai');

// Listen for messages from background script (for CLI flow)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AskPlex Content] Received message:', message);

  if (message.type === 'ping') {
    sendResponse({ success: true, pong: true });
    return true;
  }

  if (message.type === 'askQuestion') {
    // For now, just acknowledge - the actual work is done via executeScript
    sendResponse({ success: true, message: 'Use popup test panel for now' });
    return true;
  }
});

console.log('[AskPlex Content] Ready');
