/**
 * ui.js
 * Handle all DOM manipulations and UI updates.
 */

var toastTimer;
var isLoading = false;

function showToast(msg) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2500);
}

function hideEmptyState() {
  var empty = document.getElementById('empty-state');
  if (empty) empty.style.display = 'none';
}

function showLoading(text) {
  var el = document.createElement('div');
  el.className = 'loading-card';
  el.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">' + text + '<span class="loading-dots"></span></div>';
  document.getElementById('output-area').appendChild(el);
  scrollToBottom();
  return el;
}

function addAnalysisCard(content, severity, time, ragDocs) {
  var sevClass = severity === 'CRITICAL' ? 'sev-critical' : severity === 'WARNING' ? 'sev-warning' : 'sev-info';
  var el = document.createElement('div');
  el.className = 'analysis-card';
  
  var ragHtml = '';
  if (ragDocs && ragDocs.length > 0) {
    var tags = ragDocs.map(function(item) {
      return '<span class="rag-doc-tag">' + escapeHtml(item.doc.title) + '</span>';
    }).join('');
    ragHtml = '<div class="rag-badge"><span class="rag-icon">RAG Context:</span> ' + tags + '</div>';
  }

  el.innerHTML = '<div class="card-header"><div class="card-title">AI Analysis</div><div style="display:flex;gap:8px;align-items:center"><span class="severity-badge ' + sevClass + '">' + severity + '</span><span class="card-ts">' + time + '</span></div></div><div class="card-body">' + ragHtml + '<p>' + escapeHtml(content) + '</p></div>';
  document.getElementById('output-area').appendChild(el);
  scrollToBottom();
}

function addFollowupCard(content, time) {
  var el = document.createElement('div');
  el.className = 'analysis-card';
  el.innerHTML = '<div class="card-header"><div class="card-title">Follow-up Answer</div><span class="card-ts">' + time + '</span></div><div class="card-body"><p>' + escapeHtml(content) + '</p></div>';
  document.getElementById('output-area').appendChild(el);
  scrollToBottom();
}

function addUserMessage(text) {
  var el = document.createElement('div');
  el.style.cssText = 'background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#fdba74;animation:slideIn 0.2s ease-out;';
  el.innerHTML = '<strong style="color:#fdba74">You:</strong> ' + escapeHtml(text);
  document.getElementById('output-area').appendChild(el);
  scrollToBottom();
}

function addErrorCard(msg) {
  var el = document.createElement('div');
  el.style.cssText = 'background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:14px;font-size:13px;color:#fca5a5;animation:slideIn 0.2s ease-out;';
  el.innerHTML = '<strong>Error:</strong> ' + escapeHtml(msg) + '<br/><small style="color:#94a3b8;margin-top:4px;display:block">Please check your API Key and endpoint.</small>';
  document.getElementById('output-area').appendChild(el);
  scrollToBottom();
}

function removeElement(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
function scrollToBottom() { var area = document.getElementById('output-area'); setTimeout(function () { area.scrollTop = area.scrollHeight; }, 50); }
function getSeverityFromText(text) { var t = text.toUpperCase(); if (t.includes('CRITICAL') || t.includes('FATAL')) return 'CRITICAL'; if (t.includes('WARNING') || t.includes('WARN')) return 'WARNING'; return 'INFO'; }
function escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>'); }
function setLoading(state) { isLoading = state; document.getElementById('analyze-btn').disabled = state; document.getElementById('send-btn').disabled = state; }

function clearOutput() {
  document.getElementById('output-area').innerHTML = '<div class="empty-state" id="empty-state"><h3>Paste log, click Analyze</h3><p>AI will diagnose the root cause,<br/>explain the impact, and provide<br/>actionable solutions.</p></div>';
}

function updateCounter() {
  var val = document.getElementById('log-input').value;
  var lines = val.split('\\n').filter(function(l) { return l.trim(); }).length;
  document.getElementById('log-counter').textContent = lines + ' lines';
}

function toggleRagPanel() {
  var body = document.getElementById('rag-panel-body');
  var chevron = document.getElementById('rag-chevron');
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    chevron.classList.remove('open');
  } else {
    body.classList.add('open');
    chevron.classList.add('open');
    renderRagDocs();
  }
}

function renderRagDocs() {
  var list = document.getElementById('rag-doc-list');
  var docs = ragGetAllDocs();
  document.getElementById('rag-panel-count').textContent = docs.length;
  
  var html = '';
  docs.forEach(function(doc) {
    var typeBadge = doc.type === 'builtin' ? '<span class="rag-doc-type">BUILTIN</span>' : '<span class="rag-doc-type">CUSTOM</span>';
    var removeBtn = doc.type === 'custom' ? '<button class="btn-rag-remove" onclick="removeRagDoc(\\'' + doc.id + '\\')">×</button>' : '';
    html += '<div class="rag-doc-item ' + (doc.type === 'builtin' ? 'builtin' : '') + '">' +
              '<div class="rag-doc-name">' + typeBadge + escapeHtml(doc.title) + '</div>' +
              removeBtn +
            '</div>';
  });
  list.innerHTML = html;
}

function removeRagDoc(id) {
  ragRemoveCustomDoc(id);
  renderRagDocs();
}

function handleRagUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var content = e.target.result;
    ragAddCustomDoc(file.name, content);
    showToast('Document ' + file.name + ' added to knowledge base');
    renderRagDocs();
    event.target.value = '';
  };
  reader.readAsText(file);
}
