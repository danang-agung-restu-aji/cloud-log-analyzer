#  Workshop Guide: Cloud Log Analyzer dengan Huawei MAAS API
> **Durasi**: 30 Menit | **Audience**: SRE / DevOps | **Level**: Menengah (familiar HTML/JS)

---

##  Apa yang Akan Dibangun?

Sebuah **web app AI Log Analyzer** yang:
- Menerima input log error / stack trace
- Memanggil **Huawei MAAS API** (model GLM-5.2)
- Menghasilkan analisis: root cause, severity, dampak, langkah fix & pencegahan
- Mendukung **follow-up chat** untuk pertanyaan lanjutan

**Output akhir**: File `index.html` yang bisa dibuka langsung di browser — **zero install**.

---

## ️ Timeline Workshop (30 Menit)

```
[00:00 – 05:00] INTRO          → Apa itu MAAS? Demo live hasil akhir
[05:00 – 10:00] SETUP          → Buat akun, ambil API Key
[10:00 – 25:00] LIVE CODING    → Build step-by-step bareng peserta
[25:00 – 30:00] DEMO & Q&A     → Peserta coba sendiri, diskusi
```

---

##  SEGMEN 1: INTRO (5 Menit)

### Talking Points untuk Fasilitator

**"Kenapa AI untuk SRE?"**
> Kita rata-rata ngabisin 20-40 menit buat diagnosa satu incident. Dengan AI, bisa dipotong jadi 2 menit. Bukan replace kita — tapi jadi first responder yang cepat."

**"Kenapa Huawei MAAS?"**
> - OpenAI-compatible API → gampang integrasi
> - Model GLM-5.2 bagus untuk Bahasa Indonesia
> - Ada DeepSeek, Qwen juga tersedia
> - Data center di Asia (latency rendah untuk kita)

**"Demo dulu"** → Buka `index.html`, paste sample log K8s CrashLoopBackOff, klik Analisis.

---

##  SEGMEN 2: SETUP API KEY (5 Menit)

### Langkah untuk Peserta

1. **Buka**: [https://console.huaweicloud.com](https://console.huaweicloud.com)
2. **Navigasi ke**: ModelArts → MaaS → Model Square
3. **Subscribe** ke model **GLM-5.2** (klik "Subscribe" / "Free Trial")
4. **Buat API Key**:
   - Klik profile → "My API Keys" atau di MaaS Console sidebar
   - Klik "Create API Key"
   - **Copy dan simpan** — tidak bisa dilihat lagi!
5. **Catat endpoint**:
   ```
   https://api-ap-southeast-1.modelarts-maas.com/v1/chat/completions
   ```

> [!IMPORTANT]
> **Fasilitator**: Siapkan 1 API Key backup untuk peserta yang stuck di langkah ini.
> Jangan share ke grup — gunakan pastebin private / QR code dengan expired time.

---

##  SEGMEN 3: LIVE CODING (15 Menit)

### Pendekatan: Build from Scratch → Jelaskan Setiap Bagian

Buka VS Code, buat file baru `index.html`. Build **incremental**:

---

### STEP 1 (2 menit): Skeleton HTML

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cloud Log Analyzer</title>
</head>
<body>
  <h1> Clouc Log Analyzer</h1>
  <textarea id="log-input" rows="10" cols="60"
    placeholder="Paste log error di sini..."></textarea>
  <br>
  <button onclick="analyzeLog()">Analisis dengan AI</button>
  <div id="output"></div>
</body>
</html>
```

**Poin diskusi**: "Ini sudah bisa jalan. Sekarang kita tambah 'otak'-nya."

---

### STEP 2 (3 menit): Fungsi API Call

```html
<script>
const API_KEY = "PASTE_YOUR_KEY_HERE";  // ← peserta isi di sini
const ENDPOINT = "https://api-ap-southeast-1.modelarts-maas.com/v1/chat/completions";
const MODEL = "GLM-5.2";

async function callMaasAPI(userMessage) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Kamu adalah AI asisten SRE. Analisis log error yang diberikan: jelaskan root cause, severity, dampak, dan langkah perbaikan."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
</script>
```

**Poin diskusi**:
- `Authorization: Bearer` → standar yang sama dengan OpenAI
- `temperature: 0.3` → lebih deterministik, bagus untuk analisis teknis
- `system prompt` → ini yang bikin AI "jadi SRE", bukan general chatbot

---

### STEP 3 (3 menit): Wiring UI

```javascript
async function analyzeLog() {
  const logText = document.getElementById("log-input").value;
  
  if (!logText.trim()) {
    alert("Paste log dulu!");
    return;
  }
  
  const outputDiv = document.getElementById("output");
  outputDiv.textContent = " Menganalisis...";
  
  try {
    const result = await callMaasAPI(`Analisis log ini:\n\n${logText}`);
    outputDiv.textContent = result;
  } catch (err) {
    outputDiv.textContent = " Error: " + err.message;
  }
}
```

**Demo**: Simpan, buka di browser, paste log OOM, klik analisis.

**"Ini sudah JALAN! Kita baru pakai ~30 baris kode."**

---

### STEP 4 (4 menit): Tambah Conversation History

```javascript
// Upgrade: maintain context untuk follow-up questions
let conversationHistory = [];

async function analyzeLog() {
  const logText = document.getElementById("log-input").value.trim();
  if (!logText) return;

  // Reset conversation dengan log baru
  conversationHistory = [
    {
      role: "system",
      content: "Kamu adalah AI asisten SRE. Analisis log: jelaskan root cause, severity, dampak, dan langkah fix."
    },
    {
      role: "user",
      content: `Analisis log ini:\n\n${logText}`
    }
  ];

  const outputDiv = document.getElementById("output");
  outputDiv.textContent = " Menganalisis...";

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: conversationHistory,
      max_tokens: 1000,
      temperature: 0.3
    })
  });

  const data = await response.json();
  const aiReply = data.choices[0].message.content;
  
  outputDiv.textContent = aiReply;
  
  // Simpan reply ke history untuk follow-up
  conversationHistory.push({ role: "assistant", content: aiReply });
}

async function sendFollowup() {
  const question = document.getElementById("followup").value.trim();
  if (!question || conversationHistory.length === 0) return;

  conversationHistory.push({ role: "user", content: question });

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: conversationHistory,
      max_tokens: 800,
      temperature: 0.3
    })
  });

  const data = await response.json();
  const aiReply = data.choices[0].message.content;
  
  document.getElementById("output").textContent += "\n\n---\nYou: " + question + "\n\nAI: " + aiReply;
  conversationHistory.push({ role: "assistant", content: aiReply });
  document.getElementById("followup").value = "";
}
```

**Poin diskusi**: "API ini stateless — kita yang harus manage history. Ini pola yang sama di semua LLM API."

---

### STEP 5 (3 menit): Polish dengan Versi Final

```
"Sekarang kita lihat versi final yang sudah saya siapkan dengan UI yang lebih polished."
```

Buka `index.html` yang sudah disiapkan → walkthrough fitur:
- Dark mode SRE aesthetic ✓
- Sample logs (OOM, DB Error, K8s, Nginx 502, dll) ✓
- API Key disimpan di localStorage ✓
- Loading state ✓
- Follow-up chat ✓

---

##  SEGMEN 4: DEMO & Q&A (5 Menit)

### Skenario Demo yang Menarik

1. **"Coba paste log dari sistem kalian"** — biarkan peserta input log nyata
2. **Follow-up challenge**: Setelah analisis OOM, tanya: *"Gimana cara monitor ini pakai Prometheus?"*
3. **Ganti system prompt live**: Ubah jadi Bahasa Inggris atau tambah konteks spesifik

### Pertanyaan yang Sering Muncul

| Pertanyaan | Jawaban |
|------------|---------|
| "Apakah log kita aman?" | Log dikirim ke API Huawei — pastikan tidak ada credential di log. Untuk production: consider on-premise deployment. |
| "Bisa pakai model lain?" | Ya! Ganti `MODEL` ke `DeepSeek-V4-Flash` atau `Qwen3` — format API sama. |
| "Bisa diintegrasikan ke Slack/PagerDuty?" | Ya, tambahkan webhook call setelah dapat response AI. |
| "Biaya API-nya berapa?" | Cek pricing di console — ada free tier untuk trial. |

---

##  TROUBLESHOOTING GUIDE

### Error 401 Unauthorized
```
→ API Key salah atau expired
→ Pastikan format: "Bearer YOUR_KEY" (ada spasi)
```

### Error 404
```
→ Endpoint salah atau model belum di-subscribe
→ Cek region: ap-southeast-1 vs ap-southeast-4
```

### Error CORS (di browser console)
```
→ Normal jika akses langsung dari browser ke beberapa endpoint
→ Solusi: gunakan MAAS endpoint yang support CORS, atau buat backend proxy sederhana
```

### Response kosong / `undefined`
```
→ Cek struktur response: console.log(data) untuk lihat format
→ Pastikan model sudah tersubscribe di console
```

---

##  IDE EXTENSION (Bonus jika ada waktu)

Setelah 30 menit, peserta bisa explore sendiri:

1. **Multi-log comparison**: Upload 2 log, AI compare & prioritize
2. **Alert routing suggestion**: AI rekomendasi siapa yang harus di-notify
3. **Runbook generator**: Dari log error, generate runbook markdown
4. **Integrasi ke pipeline**: Curl call MAAS API dalam script bash monitoring

---

##  File yang Disiapkan

```
Workshop MAAS/
├── index.html          ← Aplikasi final (sudah jadi, siap demo)
└── WORKSHOP_GUIDE.md   ← Panduan ini
```

---

##  Checklist Fasilitator Pre-Workshop

- [ ] Akun Huawei Cloud sudah aktif & login
- [ ] API Key sudah dibuat & dicatat
- [ ] Model GLM-5.2 sudah disubscribe di console
- [ ] `index.html` sudah dicoba jalan di browser
- [ ] Backup API Key disiapkan untuk peserta yang stuck
- [ ] Browser sudah buka: console.huaweicloud.com (untuk demo setup)
- [ ] VS Code terbuka dengan file kosong untuk live coding
