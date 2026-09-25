/**
 * Synthetic monitoring – homepage + quest board availability
 *
 * Runs checks on a configurable interval, tracks uptime history,
 * and alerts (console + optional webhook) when availability changes.
 *
 * Usage:
 *   BASE_URL=https://your-app.com \
 *   INTERVAL_MS=60000 \
 *   ALERT_WEBHOOK_URL=https://hooks.slack.com/... \
 *   npx tsx scripts/synthetic-monitor.ts
 *
 * One-shot (CI):
 *   ONCE=true BASE_URL=https://your-app.com npx tsx scripts/synthetic-monitor.ts
 */

const BASE_URL    = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS ?? '60000', 10);
const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL ?? '';
const ONCE        = process.env.ONCE === 'true';
const TIMEOUT_MS  = 10_000;

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── State ────────────────────────────────────────────────────────────────────

const uptime: Record<string, UptimeRecord> = {};
// Track last known status to fire alerts only on state change
const lastStatus: Record<string, boolean> = {};

// ── Pages to monitor ─────────────────────────────────────────────────────────

const CHECKS: Array<{ name: string; path: string; markers: string[] }> = [
  {
    name: 'Homepage',
    path: '/',
    markers: ['stellarearn', 'quest'],
  },
  {
    name: 'Quest Board',
    path: '/quests',
    markers: ['quest'],
  },
];

// ── Core check ───────────────────────────────────────────────────────────────

async function checkPage(
  name: string,
  path: string,
  markers: string[],
): Promise<CheckResult> {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StellarEarn-SyntheticMonitor/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const durationMs = Date.now() - start;
    const body = await res.text();

    if (!res.ok) {
      return { name, url, passed: false, statusCode: res.status, durationMs, error: `HTTP ${res.status}` };
    }

    const missing = markers.filter(m => !body.toLowerCase().includes(m.toLowerCase()));
    if (missing.length > 0) {
      return { name, url, passed: false, statusCode: res.status, durationMs, error: `Missing content: ${missing.join(', ')}` };
    }

    return { name, url, passed: true, statusCode: res.status, durationMs };
  } catch (err) {
    return { name, url, passed: false, durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Alerting ─────────────────────────────────────────────────────────────────

async function sendAlert(result: CheckResult, recovered: boolean): Promise<void> {
  const emoji  = recovered ? '✅' : '🚨';
  const state  = recovered ? 'RECOVERED' : 'DOWN';
  const pct    = uptimePct(result.name);
  const msg    = `${emoji} [StellarEarn Monitor] ${result.name} is ${state} | ${result.url} | uptime ${pct}%${result.error ? ` | ${result.error}` : ''}`;

  console.log(msg);

  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      console.error('  ↳ Webhook delivery failed');
    }
  }
}

// ── Uptime helpers ────────────────────────────────────────────────────────────

function recordResult(name: string, passed: boolean): void {
  if (!uptime[name]) uptime[name] = { total: 0, passed: 0 };
  uptime[name].total++;
  if (passed) uptime[name].passed++;
}

function uptimePct(name: string): string {
  const r = uptime[name];
  if (!r || r.total === 0) return '—';
  return ((r.passed / r.total) * 100).toFixed(1);
}

// ── Single run ────────────────────────────────────────────────────────────────

async function runChecks(): Promise<boolean> {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] Running checks against ${BASE_URL}`);

  const results = await Promise.all(
    CHECKS.map(c => checkPage(c.name, c.path, c.markers))
  );

  let allPassed = true;

  for (const r of results) {
    recordResult(r.name, r.passed);

    const icon   = r.passed ? '✅' : '❌';
    const code   = r.statusCode != null ? ` [${r.statusCode}]` : '';
    const pct    = uptimePct(r.name);
    console.log(`  ${icon} ${r.name}${code}  ${r.durationMs}ms  uptime ${pct}%${r.error ? `  ↳ ${r.error}` : ''}`);

    // Alert only on state change (up→down or down→up)
    const prev = lastStatus[r.name];
    if (prev === true && !r.passed) await sendAlert(r, false);       // went down
    if (prev === false && r.passed) await sendAlert(r, true);        // recovered
    if (prev === undefined && !r.passed) await sendAlert(r, false);  // first check failed

    lastStatus[r.name] = r.passed;
    if (!r.passed) allPassed = false;
  }

  return allPassed;
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`🔍 Synthetic monitor started | target: ${BASE_URL} | interval: ${ONCE ? 'once' : `${INTERVAL_MS}ms`}`);

  const passed = await runChecks();

  if (ONCE) {
    process.exit(passed ? 0 : 1);
  }

  // Continuous mode
  setInterval(runChecks, INTERVAL_MS);
}

main();
