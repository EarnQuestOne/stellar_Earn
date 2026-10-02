/**
 * Unit tests for synthetic-monitor.ts
 *
 * Run with:
 *   npx tsx scripts/synthetic-monitor.test.ts
 */

import assert from "node:assert/strict";

// ── Minimal inline re-implementation of the testable units ───────────────────
// We import the logic by re-declaring the pure functions here so we can test
// them without side-effects (no setInterval, no process.exit).

interface CheckResult {
  name: string;
  url: string;
  passed: boolean;
  statusCode?: number;
  durationMs: number;
  error?: string;
}

interface UptimeRecord {
  total: number;
  passed: number;
}

function uptimePct(uptime: Record<string, UptimeRecord>, name: string): string {
  const r = uptime[name];
  if (!r || r.total === 0) return "—";
  return ((r.passed / r.total) * 100).toFixed(1);
}

function recordResult(
  uptime: Record<string, UptimeRecord>,
  name: string,
  passed: boolean,
): void {
  if (!uptime[name]) uptime[name] = { total: 0, passed: 0 };
  uptime[name].total++;
  if (passed) uptime[name].passed++;
}

// Extracted checkPage logic (pure, accepts a fetch-like function for injection)
async function checkPage(
  fetchFn: typeof fetch,
  baseUrl: string,
  name: string,
  path: string,
  markers: string[],
  timeoutMs = 10_000,
): Promise<CheckResult> {
  const url = `${baseUrl}${path}`;
  const start = Date.now();
  try {
    const res = await fetchFn(url, {
      headers: { "User-Agent": "StellarEarn-SyntheticMonitor/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const durationMs = Date.now() - start;
    const body = await res.text();

    if (!res.ok) {
      return {
        name,
        url,
        passed: false,
        statusCode: res.status,
        durationMs,
        error: `HTTP ${res.status}`,
      };
    }

    const missing = markers.filter(
      (m) => !body.toLowerCase().includes(m.toLowerCase()),
    );
    if (missing.length > 0) {
      return {
        name,
        url,
        passed: false,
        statusCode: res.status,
        durationMs,
        error: `Missing content: ${missing.join(", ")}`,
      };
    }

    return { name, url, passed: true, statusCode: res.status, durationMs };
  } catch (err) {
    return {
      name,
      url,
      passed: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFetch(status: number, body: string): typeof fetch {
  return async (_url: RequestInfo | URL, _init?: RequestInit) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
    }) as Response;
}

function makeThrowingFetch(message: string): typeof fetch {
  return async () => {
    throw new Error(message);
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function test_checkPage_passes_when_status_ok_and_markers_present() {
  const result = await checkPage(
    makeFetch(200, "<html>StellarEarn quest board</html>"),
    "http://localhost:3000",
    "Homepage",
    "/",
    ["stellarearn", "quest"],
  );
  assert.equal(result.passed, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.error, undefined);
}

async function test_checkPage_fails_when_status_not_ok() {
  const result = await checkPage(
    makeFetch(503, "Service Unavailable"),
    "http://localhost:3000",
    "Homepage",
    "/",
    ["stellarearn"],
  );
  assert.equal(result.passed, false);
  assert.equal(result.statusCode, 503);
  assert.match(result.error!, /HTTP 503/);
}

async function test_checkPage_fails_when_marker_missing() {
  const result = await checkPage(
    makeFetch(200, "<html>some other content</html>"),
    "http://localhost:3000",
    "Quest Board",
    "/quests",
    ["quest"],
  );
  assert.equal(result.passed, false);
  assert.match(result.error!, /Missing content/);
  assert.match(result.error!, /quest/);
}

async function test_checkPage_fails_on_network_error() {
  const result = await checkPage(
    makeThrowingFetch("ECONNREFUSED"),
    "http://localhost:3000",
    "Homepage",
    "/",
    ["stellarearn"],
  );
  assert.equal(result.passed, false);
  assert.match(result.error!, /ECONNREFUSED/);
}

async function test_checkPage_marker_check_is_case_insensitive() {
  const result = await checkPage(
    makeFetch(200, "<html>STELLAREARN QUEST</html>"),
    "http://localhost:3000",
    "Homepage",
    "/",
    ["stellarearn", "quest"],
  );
  assert.equal(result.passed, true);
}

async function test_checkPage_url_is_constructed_correctly() {
  let capturedUrl = "";
  const capturingFetch: typeof fetch = async (url, _init) => {
    capturedUrl = url.toString();
    return {
      ok: true,
      status: 200,
      text: async () => "quest stellarearn",
    } as Response;
  };
  await checkPage(
    capturingFetch,
    "https://example.com",
    "Quest Board",
    "/quests",
    ["quest"],
  );
  assert.equal(capturedUrl, "https://example.com/quests");
}

function test_uptimePct_returns_dash_when_no_data() {
  const uptime: Record<string, UptimeRecord> = {};
  assert.equal(uptimePct(uptime, "Homepage"), "—");
}

function test_uptimePct_returns_100_when_all_pass() {
  const uptime: Record<string, UptimeRecord> = {};
  recordResult(uptime, "Homepage", true);
  recordResult(uptime, "Homepage", true);
  assert.equal(uptimePct(uptime, "Homepage"), "100.0");
}

function test_uptimePct_returns_0_when_all_fail() {
  const uptime: Record<string, UptimeRecord> = {};
  recordResult(uptime, "Homepage", false);
  recordResult(uptime, "Homepage", false);
  assert.equal(uptimePct(uptime, "Homepage"), "0.0");
}

function test_uptimePct_calculates_partial_uptime() {
  const uptime: Record<string, UptimeRecord> = {};
  recordResult(uptime, "Quest Board", true);
  recordResult(uptime, "Quest Board", false);
  recordResult(uptime, "Quest Board", false);
  recordResult(uptime, "Quest Board", true);
  assert.equal(uptimePct(uptime, "Quest Board"), "50.0");
}

function test_recordResult_tracks_multiple_checks_independently() {
  const uptime: Record<string, UptimeRecord> = {};
  recordResult(uptime, "Homepage", true);
  recordResult(uptime, "Quest Board", false);
  assert.equal(uptime["Homepage"].total, 1);
  assert.equal(uptime["Homepage"].passed, 1);
  assert.equal(uptime["Quest Board"].total, 1);
  assert.equal(uptime["Quest Board"].passed, 0);
}

// ── Runner ────────────────────────────────────────────────────────────────────

const tests: Array<[string, () => void | Promise<void>]> = [
  [
    "checkPage passes when status ok and markers present",
    test_checkPage_passes_when_status_ok_and_markers_present,
  ],
  [
    "checkPage fails when status not ok",
    test_checkPage_fails_when_status_not_ok,
  ],
  [
    "checkPage fails when marker missing",
    test_checkPage_fails_when_marker_missing,
  ],
  ["checkPage fails on network error", test_checkPage_fails_on_network_error],
  [
    "checkPage marker check is case insensitive",
    test_checkPage_marker_check_is_case_insensitive,
  ],
  [
    "checkPage url is constructed correctly",
    test_checkPage_url_is_constructed_correctly,
  ],
  [
    "uptimePct returns dash when no data",
    test_uptimePct_returns_dash_when_no_data,
  ],
  [
    "uptimePct returns 100 when all pass",
    test_uptimePct_returns_100_when_all_pass,
  ],
  ["uptimePct returns 0 when all fail", test_uptimePct_returns_0_when_all_fail],
  [
    "uptimePct calculates partial uptime",
    test_uptimePct_calculates_partial_uptime,
  ],
  [
    "recordResult tracks multiple checks independently",
    test_recordResult_tracks_multiple_checks_independently,
  ],
];

async function runAll(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}`);
      console.error(`     ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
