// AskPlex Test Popup

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const testQuestion = document.getElementById('testQuestion');
const answerOutput = document.getElementById('answerOutput');
const logBox = document.getElementById('logBox');

const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

const btnEnterText = document.getElementById('btnEnterText');
const btnSubmit = document.getElementById('btnSubmit');
const btnGetAnswer = document.getElementById('btnGetAnswer');
const btnRunAll = document.getElementById('btnRunAll');
const btnCopyToClipboard = document.getElementById('btnCopyToClipboard');
const btnFocusInput = document.getElementById('btnFocusInput');
const btnDebugDOM = document.getElementById('btnDebugDOM');
const btnGoHome = document.getElementById('btnGoHome');
const btnReset = document.getElementById('btnReset');

let perplexityTabId = null;

// Logging
function log(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const time = new Date().toTimeString().substring(0, 8);
  entry.textContent = `[${time}] ${message}`;
  logBox.insertBefore(entry, logBox.firstChild);
  console.log(`[AskPlex Popup] ${message}`);
}

// Reset steps
function resetSteps() {
  step1.className = 'step';
  step2.className = 'step';
  step3.className = 'step';
  answerOutput.textContent = 'No answer yet. Run the test to see results.';
  answerOutput.className = 'output-box empty';
}

// Find Perplexity tab
async function findPerplexityTab() {
  const tabs = await chrome.tabs.query({ url: 'https://www.perplexity.ai/*' });
  if (tabs.length === 0) {
    throw new Error('No perplexity.ai tab found. Please open perplexity.ai first.');
  }
  perplexityTabId = tabs[0].id;
  log(`Found Perplexity tab: ${perplexityTabId}`, 'success');
  return tabs[0];
}

// Execute script in Perplexity tab
async function executeInTab(func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: perplexityTabId },
    func: func,
    args: args
  });
  return results[0]?.result;
}

// Step 1: Enter text into input field
async function enterText() {
  step1.className = 'step active';
  log('Step 1: Entering text...');
  
  const question = testQuestion.textContent;
  
  const result = await executeInTab((text) => {
    const inputField = document.getElementById('ask-input');
    if (!inputField) {
      return { success: false, error: 'Input field not found (#ask-input)' };
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
    
    // Dispatch the paste event
    inputField.dispatchEvent(pasteEvent);
    
    // Wait and check result
    const currentText = inputField.textContent;
    return { 
      success: currentText && currentText.trim().length > 0 && !currentText.includes(text + text), 
      text: currentText,
      innerHTML: inputField.innerHTML.substring(0, 300)
    };
  }, [question]);
  
  log(`innerHTML: ${result?.innerHTML || 'none'}`);
  
  if (result?.success) {
    step1.className = 'step done';
    log(`Text entered: "${result.text}"`, 'success');
    return true;
  } else {
    step1.className = 'step error';
    log(`Error: Text not properly inserted. Got: "${result?.text || ''}"`, 'error');
    
    // Try alternative: copy to clipboard and let user paste manually
    try {
      await navigator.clipboard.writeText(question);
      log('Text copied to clipboard. Try Ctrl+V in Perplexity input.', 'info');
    } catch(e) {}
    
    return false;
  }
}

// Step 2: Click submit button
async function submitQuestion() {
  step2.className = 'step active';
  log('Step 2: Submitting...');
  
  const result = await executeInTab(() => {
    // List all buttons for debugging
    const allButtons = document.querySelectorAll('button[aria-label]');
    const buttonLabels = Array.from(allButtons).map(b => b.getAttribute('aria-label'));
    console.log('Available buttons:', buttonLabels);
    
    // Helper function to simulate a real click
    function simulateRealClick(element) {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Dispatch mousedown, mouseup, and click events
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: centerX,
        clientY: centerY
      });
      
      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: centerX,
        clientY: centerY
      });
      
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: centerX,
        clientY: centerY
      });
      
      element.dispatchEvent(mouseDownEvent);
      element.dispatchEvent(mouseUpEvent);
      element.dispatchEvent(clickEvent);
    }
    
    // Try to find submit button (appears when text is entered)
    let submitBtn = document.querySelector('button[aria-label="Submit"]');
    
    if (submitBtn) {
      // Try simulated real click first
      simulateRealClick(submitBtn);
      
      // Also try direct click as backup
      setTimeout(() => submitBtn.click(), 50);
      
      return { success: true, method: 'Submit button (simulated click)', buttons: buttonLabels };
    }
    
    // Fallback: try Enter key on input (this is more reliable for Perplexity)
    const inputField = document.getElementById('ask-input');
    if (inputField) {
      inputField.focus();
      
      // Create a proper Enter key event with all necessary properties
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        charCode: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window
      });
      
      // Dispatch on the input field
      const dispatched = inputField.dispatchEvent(enterEvent);
      
      // Also try on document
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      return { success: true, method: 'Enter key on input', dispatched, buttons: buttonLabels };
    }
    
    // If no Submit button, the text might not have been entered properly
    const voiceBtn = document.querySelector('button[aria-label="Voice mode"]');
    if (voiceBtn) {
      return { 
        success: false, 
        error: 'Submit button not found - only Voice mode button exists. Text may not have been entered properly.',
        buttons: buttonLabels
      };
    }
    
    return { success: false, error: 'No submit method found', buttons: buttonLabels };
  });
  
  log(`Available buttons: ${result?.buttons?.join(', ') || 'none'}`);
  
  if (result?.success) {
    step2.className = 'step done';
    log(`Submitted via ${result.method}`, 'success');
    return true;
  } else {
    step2.className = 'step error';
    log(`Error: ${result?.error || 'Unknown error'}`, 'error');
    return false;
  }
}

// Step 3: Get answer
async function getAnswer() {
  step3.className = 'step active';
  log('Step 3: Waiting for answer...');
  
  const maxAttempts = 60; // 30 seconds
  let attempts = 0;
  let lastContent = '';
  let stableCount = 0;
  
  while (attempts < maxAttempts) {
    const result = await executeInTab(() => {
      // Look for answer content
      const markdownContent = document.querySelector('[id^="markdown-content-"]');
      if (!markdownContent) {
        return { found: false };
      }
      
      // Get text
      const text = markdownContent.textContent.trim();
      
      // Check if complete
      const pageText = document.body.textContent;
      const isComplete = pageText.includes('Prepared using') || 
                        pageText.includes('step completed') ||
                        pageText.includes('steps completed');
      
      return { found: true, text, isComplete };
    });
    
    if (result?.found && result.text) {
      log(`Found content (${result.text.length} chars), complete: ${result.isComplete}`);
      
      if (result.isComplete && result.text === lastContent) {
        stableCount++;
        if (stableCount >= 2) {
          step3.className = 'step done';
          log('Answer complete!', 'success');
          
          answerOutput.textContent = result.text;
          answerOutput.className = 'output-box success';
          return result.text;
        }
      } else {
        stableCount = 0;
      }
      lastContent = result.text;
    }
    
    attempts++;
    await new Promise(r => setTimeout(r, 500));
  }
  
  if (lastContent) {
    step3.className = 'step done';
    log('Timeout but got partial answer', 'info');
    answerOutput.textContent = lastContent;
    answerOutput.className = 'output-box success';
    return lastContent;
  }
  
  step3.className = 'step error';
  log('Timeout waiting for answer', 'error');
  answerOutput.textContent = 'Error: Timeout waiting for answer';
  answerOutput.className = 'output-box error';
  return null;
}

// Run all steps
async function runAllSteps() {
  resetSteps();
  log('=== Starting full test ===', 'info');
  
  try {
    await findPerplexityTab();
    
    if (await enterText()) {
      await new Promise(r => setTimeout(r, 1000)); // Wait for UI
      
      if (await submitQuestion()) {
        await new Promise(r => setTimeout(r, 1000)); // Wait for submission
        await getAnswer();
      }
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    answerOutput.textContent = `Error: ${error.message}`;
    answerOutput.className = 'output-box error';
  }
  
  log('=== Test complete ===', 'info');
}

// Event listeners
btnEnterText.addEventListener('click', async () => {
  try {
    await findPerplexityTab();
    await enterText();
  } catch (e) {
    log(`Error: ${e.message}`, 'error');
  }
});

btnSubmit.addEventListener('click', async () => {
  try {
    await findPerplexityTab();
    await submitQuestion();
  } catch (e) {
    log(`Error: ${e.message}`, 'error');
  }
});

// Focus the input field (helper for manual paste)
btnFocusInput.addEventListener('click', async () => {
  try {
    await findPerplexityTab();
    log('Focusing input field...');
    
    const result = await executeInTab(() => {
      const inputField = document.getElementById('ask-input');
      if (!inputField) {
        return { success: false, error: 'Input field not found' };
      }
      inputField.focus();
      
      // Also click on it
      inputField.click();
      
      return { success: true, focused: document.activeElement?.id || 'unknown' };
    });
    
    if (result?.success) {
      log(`Input focused. Active element: ${result.focused}`, 'success');
      log('Now press Ctrl+V in the Perplexity tab to paste', 'info');
    } else {
      log(`Error: ${result?.error}`, 'error');
    }
  } catch (e) {
    log(`Error: ${e.message}`, 'error');
  }
});

// Navigate to Perplexity home page
btnGoHome.addEventListener('click', async () => {
  try {
    await findPerplexityTab();
    log('Navigating to Perplexity home page...');
    
    await chrome.tabs.update(perplexityTabId, { url: 'https://www.perplexity.ai/' });
    log('Navigated to home page. Wait for it to load, then try again.', 'success');
  } catch (e) {
    log(`Error: ${e.message}`, 'error');
  }
});

btnGetAnswer.addEventListener('click', async () => {
  try {
    await findPerplexityTab();
    await getAnswer();
  } catch (e) {
    log(`Error: ${e.message}`, 'error');
  }
});

btnRunAll.addEventListener('click', runAllSteps);
btnReset.addEventListener('click', resetSteps);

btnCopyToClipboard.addEventListener('click', async () => {
  const question = testQuestion.textContent;
  try {
    await navigator.clipboard.writeText(question);
    log(`Copied "${question}" to clipboard. Now click in Perplexity input and press Ctrl+V`, 'success');
  } catch(e) {
    log(`Failed to copy: ${e.message}`, 'error');
  }
});

// Debug DOM - inspect what's actually in Perplexity's page
btnDebugDOM.addEventListener('click', async () => {
  try {
    await findPerplexityTab();
    log('Inspecting Perplexity DOM...', 'info');
    
    const result = await executeInTab(() => {
      const info = {};
      
      // Check #ask-input
      const askInput = document.getElementById('ask-input');
      if (askInput) {
        info.askInput = {
          exists: true,
          textContent: askInput.textContent,
          innerHTML: askInput.innerHTML.substring(0, 500),
          tagName: askInput.tagName,
          isContentEditable: askInput.isContentEditable
        };
      } else {
        info.askInput = { exists: false };
      }
      
      // Check for ALL text inputs and textareas
      const textareas = document.querySelectorAll('textarea');
      info.textareas = Array.from(textareas).map(ta => ({
        id: ta.id,
        className: ta.className.substring(0, 50),
        value: ta.value,
        placeholder: ta.placeholder
      }));
      
      // Check all contenteditable elements
      const editables = document.querySelectorAll('[contenteditable="true"]');
      info.editableElements = Array.from(editables).map(el => ({
        id: el.id,
        className: el.className?.substring(0, 50) || '',
        textContent: el.textContent.substring(0, 100),
        innerHTML: el.innerHTML.substring(0, 200),
        tagName: el.tagName
      }));
      
      // Find elements that contain the pasted text (search for "2+2" if user pasted it)
      const allElements = document.querySelectorAll('*');
      const elementsWithText = [];
      for (const el of allElements) {
        if (el.childNodes.length === 1 && el.textContent.includes('2+2')) {
          elementsWithText.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className?.substring?.(0, 50) || '',
            text: el.textContent.substring(0, 50)
          });
          if (elementsWithText.length >= 5) break;
        }
      }
      info.elementsContaining2plus2 = elementsWithText;
      
      // Check submit button state
      const submitBtn = document.querySelector('button[aria-label="Submit"]');
      const voiceBtn = document.querySelector('button[aria-label="Voice mode"]');
      info.submitButton = submitBtn ? { found: true, disabled: submitBtn.disabled } : { found: false };
      info.voiceModeButton = voiceBtn ? 'Found' : 'Not found';
      
      // Check URL to see if we're on a thread or home page
      info.url = window.location.href;
      info.isThread = window.location.pathname.includes('/search/') || 
                      window.location.pathname.includes('/thread/');
      
      // Look for any element with "Ask anything" placeholder
      const placeholders = document.querySelectorAll('[placeholder*="Ask"], [data-placeholder*="Ask"]');
      info.placeholderElements = Array.from(placeholders).map(el => ({
        tagName: el.tagName,
        id: el.id,
        placeholder: el.placeholder || el.dataset.placeholder
      }));
      
      return info;
    });
    
    // Log each piece of info
    log(`=== DOM Debug Info ===`, 'info');
    log(`URL: ${result.url}`, 'info');
    log(`Is thread page: ${result.isThread}`, 'info');
    
    log(`#ask-input exists: ${result.askInput?.exists}`, 'info');
    if (result.askInput?.exists) {
      log(`#ask-input text: "${result.askInput.textContent}"`, 'info');
      log(`#ask-input HTML: ${result.askInput.innerHTML || '(empty)'}`, 'info');
    }
    
    log(`Textareas found: ${result.textareas?.length || 0}`, 'info');
    result.textareas?.forEach((ta, i) => {
      log(`  Textarea[${i}]: value="${ta.value}" placeholder="${ta.placeholder}"`, ta.value ? 'success' : 'info');
    });
    
    log(`Contenteditable elements: ${result.editableElements?.length || 0}`, 'info');
    result.editableElements?.forEach((el, i) => {
      log(`  [${i}] ${el.tagName}#${el.id} text="${el.textContent}" html="${el.innerHTML}"`, el.textContent ? 'success' : 'info');
    });
    
    if (result.elementsContaining2plus2?.length > 0) {
      log(`Found elements containing "2+2":`, 'success');
      result.elementsContaining2plus2.forEach(el => {
        log(`  ${el.tagName}#${el.id} .${el.className} = "${el.text}"`, 'success');
      });
    }
    
    log(`Submit button: ${result.submitButton?.found ? 'Found' : 'Not found'}, disabled: ${result.submitButton?.disabled}`, 
        result.submitButton?.found ? 'success' : 'error');
    log(`Voice mode button: ${result.voiceModeButton}`, 'info');
    
  } catch (e) {
    log(`Debug error: ${e.message}`, 'error');
  }
});

// Check server connection
async function checkStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Extension error';
      return;
    }
    
    if (response.connected) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Bridge server connected';
    } else {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Bridge server disconnected';
    }
  });
}

// Init
checkStatus();
log('Popup loaded', 'info');
