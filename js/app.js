/**
 * app.js
 * Main application orchestrator.
 */

var conversationHistory = [];

document.addEventListener('DOMContentLoaded', function() {
  var storedKey = getApiKey();
  if (storedKey) {
    document.getElementById('api-key-input').value = '●'.repeat(20);
  }
  document.getElementById('log-input').addEventListener('input', updateCounter);
  document.getElementById('rag-panel-count').textContent = ragGetAllDocs().length;
});

function loadSample(key) {
  if (SAMPLES[key]) {
    document.getElementById('log-input').value = SAMPLES[key];
    updateCounter();
    showToast('Sample "' + key + '" loaded');
  }
}

function clearAll() {
  document.getElementById('log-input').value = '';
  updateCounter();
  clearOutput();
  conversationHistory = [];
}

async function analyzeLog() {
  var logText = document.getElementById('log-input').value.trim();
  if (!getApiKey()) { 
    showToast('Please enter API Key first'); 
    return; 
  }
  if (!logText) { 
    showToast('Please paste a log first'); 
    return; 
  }
  if (isLoading) return;

  // RAG retrieval
  var ragDocs = ragRetrieve(logText, 2);
  var ragContext = ragFormatContext(ragDocs);

  var userMessage = ragContext
    ? '[RELEVANT CONTEXT]\\n' + ragContext + '\\n\\n[LOG TO ANALYZE]\\n' + logText
    : 'Please analyze the following log:\\n\\n```\\n' + logText + '\\n```';

  conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage }
  ];

  hideEmptyState();
  var loadingEl = showLoading('Analyzing log with AI');
  setLoading(true);

  try {
    var response = await callMaasAPI(conversationHistory);
    removeElement(loadingEl);
    addAnalysisCard(response, getSeverityFromText(response), new Date().toLocaleTimeString('id-ID'), ragDocs);
    conversationHistory.push({ role: 'assistant', content: response });
  } catch (err) {
    removeElement(loadingEl);
    addErrorCard(err.message);
  } finally {
    setLoading(false);
  }
}

async function sendFollowup() {
  var input = document.getElementById('followup-input');
  var question = input.value.trim();
  
  if (!question) return;
  if (conversationHistory.length === 0) { 
    showToast('Please analyze a log first'); 
    return; 
  }
  if (isLoading) return;
  
  input.value = '';
  addUserMessage(question);
  conversationHistory.push({ role: 'user', content: question });
  
  var loadingEl = showLoading('AI is answering');
  setLoading(true);
  
  try {
    var response = await callMaasAPI(conversationHistory);
    removeElement(loadingEl);
    addFollowupCard(response, new Date().toLocaleTimeString('id-ID'));
    conversationHistory.push({ role: 'assistant', content: response });
  } catch (err) {
    removeElement(loadingEl);
    addErrorCard(err.message);
  } finally {
    setLoading(false);
  }
}
