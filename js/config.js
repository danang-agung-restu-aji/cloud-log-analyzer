/**
 * config.js
 * Konstanta global: model, system prompt, dan sample logs.
 * Ubah nilai di file ini untuk menyesuaikan behavior AI.
 */

/* ── Model & Endpoint ──────────────────────────────── */
var MODEL = 'GLM-5.2';

/* ── System Prompt ─────────────────────────────────── */
var SYSTEM_PROMPT = `Kamu adalah AI asisten SRE (Site Reliability Engineer) yang sangat berpengalaman.
Tugasmu adalah menganalisis log error atau stack trace yang diberikan.
Berikan response dalam format ini (gunakan Bahasa Indonesia):

** ROOT CAUSE**
Jelaskan penyebab utama error secara singkat dan teknis.

** SEVERITY**
Tingkat keparahan: CRITICAL / WARNING / INFO — dan alasannya.

** DAMPAK**
Apa yang terdampak? (service, user, data, dll)

**️ LANGKAH PEMULIHAN**
Step-by-step cara mengatasinya (numbered list, actionable).

** PENCEGAHAN**
Tips agar error ini tidak terulang di masa depan.

Gunakan bahasa teknis tapi mudah dipahami. Sertakan perintah spesifik jika relevan.`;

/* ── Sample Logs ───────────────────────────────────── */
var SAMPLES = {
  oom: `2024-01-15 03:42:11.234 ERROR [worker-thread-4] c.e.s.DataProcessor - Processing failed\njava.lang.OutOfMemoryError: Java heap space\n\tat java.util.Arrays.copyOf(Arrays.java:3210) ~[na:1.8.0_292]\n\tat java.util.ArrayList.grow(ArrayList.java:265) ~[na:1.8.0_292]\n\tat com.example.service.DataProcessor.loadBatch(DataProcessor.java:89)\n\tat com.example.service.DataProcessor.process(DataProcessor.java:54)\n2024-01-15 03:42:12.001 WARN  [GC-thread] GC overhead limit exceeded\n2024-01-15 03:42:12.345 ERROR [health-check] Health check FAILED - service unresponsive`,

  db: `[2024-01-15 14:23:45] FATAL: database connection pool exhausted\n[2024-01-15 14:23:45] ERROR: could not connect to server: Connection refused\n\tIs the server running on host "db-primary.internal" (10.0.1.15) and accepting\n\tTCP/IP connections on port 5432?\n[2024-01-15 14:23:46] ERROR: remaining connection slots are reserved for non-replication superuser connections\n[2024-01-15 14:23:46] WARN: Retry attempt 3/3 failed. Giving up.\n[2024-01-15 14:23:46] CRITICAL: API endpoint /api/v2/users returning 503`,

  k8s: `Events:\n  Type     Reason     Age                From               Message\n  ----     ------     ----               ----               -------\n  Normal   Scheduled  4m                 default-scheduler  Successfully assigned default/api-pod-7d9f6b8c4-xk2p9\n  Warning  BackOff    2m (x8 over 3m)   kubelet            Back-off restarting failed container\n  Warning  Failed     2m                 kubelet            Error: CrashLoopBackOff\n\nkubectl logs api-pod-7d9f6b8c4-xk2p9:\nError: ENOENT: no such file or directory, open '/app/config/production.yaml'\n    at Object.openSync (node:fs:590:18)`,

  nginx: `2024/01/15 09:15:33 [error] 12345#12345: *8472 connect() failed (111: Connection refused) while connecting to upstream, client: 203.0.113.42, server: api.example.com, request: "GET /api/health HTTP/1.1", upstream: "http://127.0.0.1:8080/api/health", host: "api.example.com"\n2024/01/15 09:15:33 [warn] 12345#12345: *8472 upstream server temporarily disabled while connecting to upstream\n2024/01/15 09:15:34 [error] 12345#12345: *8473 no live upstreams while connecting to upstream`,

  timeout: `[ERROR] 2024-01-15T11:30:00Z RequestTimeoutException: Request to payment-service timed out after 30000ms\n  at HttpClient.request (http-client.js:234)\n  at PaymentController.processPayment (payment.controller.js:89)\n[WARN]  2024-01-15T11:30:01Z Circuit breaker OPEN for payment-service (failures: 5/5)\n[ERROR] 2024-01-15T11:30:01Z 500 transactions queued, unable to process - circuit breaker open`,

  disk: `Jan 15 08:22:41 prod-server-01 mysqld: [ERROR] /var/lib/mysql/ib_logfile0: The OS said file space is exhausted.\nJan 15 08:22:41 prod-server-01 mysqld: [ERROR] InnoDB: OS error number 28 in a file operation.\nJan 15 08:22:42 prod-server-01 kernel: No space left on device\ndf -h output: /dev/sda1       100G   100G     0 100% /`,

  cert: `ssl_error: certificate has expired\n  domain: api.example.com\n  expiry: Jan 10 00:00:00 2024 GMT (expired 5 days ago)\n  issuer: Let's Encrypt Authority X3\n[CRITICAL] 2024-01-15 HTTPS handshake failed for 3842 requests in last 5 minutes\n[ERROR] curl: (60) SSL certificate problem: certificate has expired`
};
