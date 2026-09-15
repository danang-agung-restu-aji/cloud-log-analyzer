/**
 * rag.js
 * RAG (Retrieval-Augmented Generation) Engine
 *
 * Cara kerja:
 * 1. Knowledge base berisi dokumen-dokumen runbook/playbook SRE
 * 2. Setiap dokumen punya array `keywords` untuk matching
 * 3. Saat log dianalisis, engine menghitung skor relevansi tiap dokumen
 * 4. Top-K dokumen diambil dan di-inject ke prompt sebagai konteks
 *
 * User dapat menambah dokumen baru via UI (upload .txt / paste teks).
 */

/* ── Built-in Knowledge Base ───────────────────────── */
var RAG_KNOWLEDGE_BASE = [
  {
    id: 'oom',
    title: 'Java OOM / Heap Runbook',
    type: 'builtin',
    keywords: ['outofmemoryerror', 'heap', 'gc', 'memory', 'java heap space', 'gc overhead', 'garbage collector', 'xmx', 'xms', 'young generation', 'old generation'],
    content: `# Java Out of Memory (OOM) Runbook
## Penyebab Umum
- Heap size terlalu kecil untuk workload
- Memory leak: objek tidak di-GC karena masih ada referensi
- Batch processing yang memuat terlalu banyak data ke memory
- GC overhead limit exceeded: GC memakai >98% CPU

## Langkah Diagnosis
1. Analisis heap dump: \`jmap -dump:live,format=b,file=heap.hprof <pid>\`
2. Buka dengan VisualVM / Eclipse MAT
3. Cek object retensi: apa yang paling banyak memakan heap?
4. Review GC log: \`-Xloggc:/var/log/gc.log -XX:+PrintGCDetails\`

## Mitigasi Cepat
\`\`\`bash
# Restart service (temporary)
systemctl restart your-service

# Increase heap size di JVM args
-Xms2g -Xmx4g

# Aktifkan G1GC untuk large heap
-XX:+UseG1GC -XX:MaxGCPauseMillis=200
\`\`\`

## Pencegahan
- Set alert Prometheus di \`jvm_memory_used_bytes > 0.85 * jvm_memory_max_bytes\`
- Aktifkan heap dump otomatis: \`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp\`
- Review batch size dan stream processing patterns`
  },
  {
    id: 'db-pool',
    title: 'DB Connection Pool Exhausted',
    type: 'builtin',
    keywords: ['connection pool', 'exhausted', '5432', 'postgres', 'postgresql', 'mysql', 'connection refused', 'too many connections', 'max_connections', 'pgbouncer', 'connection slots'],
    content: `# Database Connection Pool Exhausted Runbook
## Penyebab Umum
- Connection pool size terlalu kecil vs concurrency
- Connection leak: koneksi tidak dikembalikan ke pool
- Database max_connections tercapai
- Database down atau tidak reachable

## Langkah Diagnosis
\`\`\`sql
-- Cek koneksi aktif di PostgreSQL
SELECT count(*), state, wait_event_type, wait_event 
FROM pg_stat_activity 
GROUP BY state, wait_event_type, wait_event;

-- Koneksi per aplikasi
SELECT application_name, count(*) 
FROM pg_stat_activity 
GROUP BY application_name ORDER BY count DESC;
\`\`\`

## Mitigasi Cepat
\`\`\`bash
# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '5 minutes';

# Pasang PgBouncer sebagai connection pooler
apt install pgbouncer
\`\`\`

## Pencegahan
- Gunakan connection pooler (PgBouncer / HikariCP)
- Set pool timeout dan max lifetime
- Monitor \`pg_stat_activity\` dengan alert di Prometheus`
  },
  {
    id: 'k8s-crashloop',
    title: 'K8s CrashLoopBackOff Runbook',
    type: 'builtin',
    keywords: ['crashloopbackoff', 'crash loop', 'back-off', 'kubernetes', 'k8s', 'pod', 'container', 'kubectl', 'oomkilled', 'enoent', 'restart'],
    content: `# Kubernetes CrashLoopBackOff Runbook
## Penyebab Umum
- Config file / secret tidak ditemukan (ENOENT)
- OOMKilled: container melebihi memory limit
- App error saat startup (DB belum ready, env var kurang)
- Readiness probe gagal berulang kali

## Langkah Diagnosis
\`\`\`bash
# Lihat events
kubectl describe pod <pod-name> -n <namespace>

# Lihat logs (termasuk restart sebelumnya)
kubectl logs <pod-name> --previous

# Cek resource usage
kubectl top pod <pod-name>

# Cek config & secrets
kubectl get configmap,secret -n <namespace>
\`\`\`

## Mitigasi Cepat
\`\`\`yaml
# Tambah resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Pastikan file config dimount benar
volumeMounts:
  - name: config
    mountPath: /app/config
\`\`\`

## Pencegahan
- Gunakan init containers untuk wait dependency
- Set liveness + readiness probe yang tepat
- Validate config dengan dry-run sebelum deploy`
  },
  {
    id: 'nginx-upstream',
    title: 'Nginx 502/Upstream Error Runbook',
    type: 'builtin',
    keywords: ['nginx', 'upstream', '502', '503', 'bad gateway', 'connect refused', 'connection refused', 'no live upstreams', 'proxy_pass'],
    content: `# Nginx 502 Bad Gateway / Upstream Error Runbook
## Penyebab Umum
- Backend service down atau tidak listening di port yang dikonfigurasi
- Backend terlalu lambat (upstream timeout)
- Semua upstream server dalam kondisi "failed" (passive health check)

## Langkah Diagnosis
\`\`\`bash
# Cek status Nginx
systemctl status nginx
nginx -t  # test config

# Cek apakah backend jalan
curl -v http://127.0.0.1:8080/health

# Lihat error log
tail -f /var/log/nginx/error.log

# Cek port listening
ss -tlnp | grep 8080
\`\`\`

## Mitigasi Cepat
\`\`\`bash
# Restart backend service
systemctl restart your-backend-service

# Reload Nginx setelah config fix
nginx -s reload
\`\`\`

## Pencegahan
- Aktifkan Nginx active health check (requires Nginx Plus atau ngx_upstream_check_module)
- Set \`upstream_fail_timeout\` dan \`max_fails\` yang tepat
- Monitor dengan Prometheus Nginx exporter`
  },
  {
    id: 'disk-full',
    title: 'Disk Full / No Space Runbook',
    type: 'builtin',
    keywords: ['no space', 'disk full', 'os error 28', 'space is exhausted', 'device full', 'inode', 'df', 'du', '/dev/sda', 'filesystem'],
    content: `# Disk Full Runbook
## Penyebab Umum
- Log files tumbuh tidak terkontrol
- Binary / dump files tidak dibersihkan
- Database transaction log penuh
- Inode habis (banyak file kecil)

## Langkah Diagnosis
\`\`\`bash
# Cek disk usage per partisi
df -h

# Cek inode usage
df -i

# Temukan direktori terbesar
du -sh /* 2>/dev/null | sort -rh | head -20
du -sh /var/log/* | sort -rh | head -10

# Cek file yang terbuka tapi sudah dihapus (zombie files)
lsof | grep deleted | awk '{print $7}' | sort -rn | head
\`\`\`

## Mitigasi Cepat
\`\`\`bash
# Bersihkan log lama
journalctl --vacuum-time=2d
find /var/log -name "*.gz" -mtime +7 -delete

# Truncate log aktif yang terlalu besar (HATI-HATI)
truncate -s 0 /var/log/app/big-log.log

# Hapus core dumps
find / -name "core.*" -delete 2>/dev/null
\`\`\`

## Pencegahan
- Setup logrotate untuk semua aplikasi
- Alert di 80% disk usage (Prometheus node_exporter)
- Pisahkan partisi untuk /var/log`
  },
  {
    id: 'ssl-cert',
    title: 'SSL Certificate Expired Runbook',
    type: 'builtin',
    keywords: ['certificate expired', 'ssl', 'tls', 'https', 'handshake', 'lets encrypt', "let's encrypt", 'certbot', 'x509', 'certificate has expired', 'curl 60'],
    content: `# SSL Certificate Expired Runbook
## Penyebab Umum
- Sertifikat Let's Encrypt tidak auto-renew (cron certbot gagal)
- Sertifikat custom expired dan tidak ada notifikasi
- Load balancer menggunakan cert lama setelah renewal

## Langkah Diagnosis
\`\`\`bash
# Cek expiry date sertifikat
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Cek status certbot
systemctl status certbot.timer
certbot certificates
\`\`\`

## Mitigasi Cepat
\`\`\`bash
# Renew manual dengan certbot
certbot renew --force-renewal

# Reload web server setelah renew
systemctl reload nginx
# atau
systemctl reload apache2

# Test SSL
curl -I https://yourdomain.com
\`\`\`

## Pencegahan
- Pastikan \`certbot.timer\` atau cron aktif
- Setup monitoring expiry: \`check certificate yourdomain.com expire in 30 days\`
- Gunakan cert monitoring (Uptime Robot, Checkly, atau Prometheus blackbox exporter)`
  },
  {
    id: 'circuit-breaker',
    title: 'Circuit Breaker Open Runbook',
    type: 'builtin',
    keywords: ['circuit breaker', 'timeout', 'payment', 'request timeout', 'open', 'failures', 'hystrix', 'resilience4j', 'retry', 'fallback'],
    content: `# Circuit Breaker Open Runbook
## Penyebab Umum
- Downstream service timeout berulang (network lambat, service overload)
- Circuit breaker threshold tercapai setelah beberapa failure
- Dependency service sedang maintenance / incident

## Langkah Diagnosis
\`\`\`bash
# Cek health downstream service
curl -v http://payment-service/health

# Lihat metrics circuit breaker (jika pakai Actuator)
curl http://localhost:8080/actuator/health | jq .

# Cek network latency
ping payment-service
traceroute payment-service
\`\`\`

## Mitigasi Cepat
\`\`\`java
// Reset circuit breaker manual (jika pakai Resilience4j)
circuitBreakerRegistry.circuitBreaker("payment").reset();

// Atau via Actuator endpoint
curl -X POST http://localhost:8080/actuator/circuitbreakers/payment/reset
\`\`\`

## Pencegahan
- Implement proper timeout di semua HTTP clients
- Tambahkan retry dengan exponential backoff
- Implement bulkhead pattern untuk isolasi failure
- Monitor circuit breaker state dengan Prometheus metrics`
  }
];

/* ── Custom Documents (ditambah via UI) ─────────────── */
var RAG_CUSTOM_DOCS = [];

/* ── Retrieval Functions ─────────────────────────────── */

/**
 * Tokenize teks menjadi array kata kunci (lowercase, deduplicated).
 * @param {string} text
 * @returns {string[]}
 */
function ragTokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(function(t) { return t.length > 2; });
}

/**
 * Hitung skor relevansi sebuah dokumen terhadap query log.
 * Skor = jumlah keyword dokumen yang ditemukan di log text (case-insensitive).
 * @param {object} doc
 * @param {string} logText
 * @returns {number}
 */
function ragScore(doc, logText) {
  var logLower = logText.toLowerCase();
  var score = 0;
  doc.keywords.forEach(function(kw) {
    if (logLower.includes(kw.toLowerCase())) {
      score++;
    }
  });
  return score;
}

/**
 * Ambil top-K dokumen paling relevan untuk log text.
 * @param {string} logText
 * @param {number} topK - jumlah dokumen yang diambil (default 2)
 * @returns {Array<{doc: object, score: number}>}
 */
function ragRetrieve(logText, topK) {
  topK = topK || 2;
  var allDocs = RAG_KNOWLEDGE_BASE.concat(RAG_CUSTOM_DOCS);

  var scored = allDocs.map(function(doc) {
    return { doc: doc, score: ragScore(doc, logText) };
  }).filter(function(item) {
    return item.score > 0;
  }).sort(function(a, b) {
    return b.score - a.score;
  });

  return scored.slice(0, topK);
}

/**
 * Format dokumen yang di-retrieve menjadi string konteks untuk prompt.
 * @param {Array<{doc: object, score: number}>} retrieved
 * @returns {string}
 */
function ragFormatContext(retrieved) {
  if (!retrieved || retrieved.length === 0) return '';

  var parts = retrieved.map(function(item) {
    return '### ' + item.doc.title + '\n' + item.doc.content;
  });

  return parts.join('\n\n---\n\n');
}

/* ── Custom Doc Management ───────────────────────────── */

/**
 * Tambah dokumen custom ke knowledge base.
 * @param {string} title
 * @param {string} content
 * @param {string[]} keywords - opsional, auto-extract jika kosong
 */
function ragAddCustomDoc(title, content, keywords) {
  if (!keywords || keywords.length === 0) {
    // Auto-extract keywords dari content (top 20 kata unik)
    var tokens = ragTokenize(content);
    var freq = {};
    tokens.forEach(function(t) { freq[t] = (freq[t] || 0) + 1; });
    keywords = Object.keys(freq).sort(function(a, b) { return freq[b] - freq[a]; }).slice(0, 20);
  }

  var doc = {
    id: 'custom-' + Date.now(),
    title: title,
    type: 'custom',
    keywords: keywords,
    content: content
  };

  RAG_CUSTOM_DOCS.push(doc);
  return doc;
}

/**
 * Hapus dokumen custom berdasarkan id.
 * @param {string} id
 */
function ragRemoveCustomDoc(id) {
  RAG_CUSTOM_DOCS = RAG_CUSTOM_DOCS.filter(function(d) { return d.id !== id; });
}

/**
 * Ambil semua dokumen (built-in + custom).
 * @returns {object[]}
 */
function ragGetAllDocs() {
  return RAG_KNOWLEDGE_BASE.concat(RAG_CUSTOM_DOCS);
}
