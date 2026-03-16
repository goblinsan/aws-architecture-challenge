#!/usr/bin/env node
/**
 * load-test.js – lightweight event-realism load check
 *
 * Simulates two realistic scenarios that happen on event day:
 *
 *  1. QR join spike   – N players scan the QR code and POST /api/join in
 *                       close succession (default: 20 concurrent requests).
 *  2. Challenge fetch – each joined entry GETs /api/session simultaneously
 *                       to simulate the initial load a player sees.
 *
 * Usage (requires Node 18+ for native fetch):
 *
 *   node scripts/load-test.js [BASE_URL] [CONCURRENCY]
 *
 * Examples:
 *   node scripts/load-test.js http://localhost:8787       # local worker dev
 *   node scripts/load-test.js https://your-worker.workers.dev 30
 *
 * The script does NOT seed the KV or reset state — run those separately
 * before testing against a real deployment.
 */

const BASE_URL = process.argv[2] ?? "http://localhost:8787";
const CONCURRENCY = parseInt(process.argv[3] ?? "20", 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n, width = 6) {
  return String(n).padStart(width, " ");
}

function printSummary(label, results) {
  const durations = results.map((r) => r.duration);
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const sorted = durations.slice().sort((a, b) => a - b);
  const p95 = sorted.length > 0 ? sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)] : 0;

  console.log(`\n── ${label} (n=${results.length}) ──────────────────────`);
  console.log(`  ✅ success : ${pad(ok)}`);
  console.log(`  ❌ failure : ${pad(fail)}`);
  console.log(`  min ms    : ${pad(min)}`);
  console.log(`  avg ms    : ${pad(avg)}`);
  console.log(`  p95 ms    : ${pad(p95)}`);
  console.log(`  max ms    : ${pad(max)}`);

  if (fail > 0) {
    const sample = results.filter((r) => !r.ok).slice(0, 3);
    console.log("  sample errors:");
    sample.forEach((r) => console.log(`    [${r.status}] ${r.error ?? ""}`));
  }
}

async function timedFetch(url, options = {}) {
  const start = Date.now();
  let ok = false;
  let status = 0;
  let error;
  try {
    const res = await fetch(url, options);
    status = res.status;
    ok = res.ok;
    if (!ok) {
      const text = await res.text().catch(() => "");
      error = text.slice(0, 120);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return { ok, status, duration: Date.now() - start, error };
}

// ---------------------------------------------------------------------------
// Scenario 1 – concurrent /api/join (QR spike)
// ---------------------------------------------------------------------------

async function scenarioJoinSpike() {
  console.log(`\n🔥 Scenario 1: QR join spike (${CONCURRENCY} concurrent joins) → ${BASE_URL}/api/join`);

  const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
    timedFetch(`${BASE_URL}/api/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: `LoadTestPlayer${i + 1}` }),
    })
  );

  const results = await Promise.all(requests);
  printSummary("POST /api/join", results);

  // Return entry IDs for the next scenario.
  return results;
}

// ---------------------------------------------------------------------------
// Scenario 2 – concurrent /api/session (challenge fetch)
// ---------------------------------------------------------------------------

async function scenarioSessionFetch() {
  console.log(`\n📋 Scenario 2: Simultaneous session fetch (${CONCURRENCY} concurrent) → ${BASE_URL}/api/session`);

  const requests = Array.from({ length: CONCURRENCY }, () =>
    timedFetch(`${BASE_URL}/api/session`)
  );

  const results = await Promise.all(requests);
  printSummary("GET /api/session", results);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log("AWS Architecture Challenge – load test");
  console.log(`Target  : ${BASE_URL}`);
  console.log(`Players : ${CONCURRENCY}`);

  await scenarioJoinSpike();
  await scenarioSessionFetch();

  console.log("\n✅ Load test complete.\n");
})().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
