/**
 * api.js
 * Handle komunikasi dengan MAAS API.
 */

var apiKey = localStorage.getItem('maas_api_key') || '';

function saveApiKey() {
  var input = document.getElementById('api-key-input');
  var val = input.value.trim();
  if (!val || val.startsWith('●')) { 
    showToast('Masukkan API key yang valid'); 
    return; 
  }
  apiKey = val;
  localStorage.setItem('maas_api_key', apiKey);
  input.value = '●'.repeat(20);
  showToast('API Key tersimpan');
}

function getApiKey() {
  return apiKey;
}

async function callMaasAPI(messages) {
  var endpoint = document.getElementById('endpoint-input').value.trim();
  var res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: MODEL, messages: messages, max_tokens: 1500, temperature: 0.3 })
  });
  if (!res.ok) {
    var errBody = await res.text();
    throw new Error('API Error ' + res.status + ': ' + errBody.slice(0, 200));
  }
  var data = await res.json();
  return data.choices[0].message.content;
}
