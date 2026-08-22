/*
 * Benchmark: cost of eagerly loading @sentry/node at startup.
 *
 * Before this change both src/config/sentry.config.ts and
 * src/common/filters/sentry-exception.filter.ts imported '@sentry/node' at the
 * top level, so the whole SDK module graph was require()d during boot even when
 * Sentry was disabled (SENTRY_DSN unset). After the change the SDK is loaded
 * lazily inside initSentry() only when SENTRY_DSN is set.
 *
 * This script measures the require() cost of @sentry/node in isolated child
 * processes. That cost is exactly what boot no longer pays in the common
 * disabled case (the "after" path does zero work).
 *
 * Usage: node scripts/bench-sentry-lazy-load.js [runs]
 */
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const RUNS = Number(process.argv[2]) || 7;
const cwd = path.resolve(__dirname, '..');

// Child that require()s @sentry/node and reports load time + memory delta.
const EAGER_CHILD = `
  const start = process.hrtime.bigint();
  const m0 = process.memoryUsage();
  require('@sentry/node');
  const end = process.hrtime.bigint();
  const m1 = process.memoryUsage();
  process.stdout.write(JSON.stringify({
    loadMs: Number(end - start) / 1e6,
    heapMB: (m1.heapUsed - m0.heapUsed) / 1048576,
    rssMB: (m1.rss - m0.rss) / 1048576,
  }));
`;

// Child that does NOT require @sentry/node (the disabled/after boot path).
const LAZY_CHILD = `
  const start = process.hrtime.bigint();
  const m0 = process.memoryUsage();
  const end = process.hrtime.bigint();
  const m1 = process.memoryUsage();
  process.stdout.write(JSON.stringify({
    loadMs: Number(end - start) / 1e6,
    heapMB: (m1.heapUsed - m0.heapUsed) / 1048576,
    rssMB: (m1.rss - m0.rss) / 1048576,
  }));
`;

function sample(code) {
  const out = execFileSync(process.execPath, ['-e', code], {
    cwd,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return { mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

function bench(label, code) {
  const loadMs = [];
  const heapMB = [];
  const rssMB = [];
  for (let i = 0; i < RUNS; i++) {
    const r = sample(code);
    loadMs.push(r.loadMs);
    heapMB.push(r.heapMB);
    rssMB.push(r.rssMB);
  }
  return {
    label,
    loadMs: stats(loadMs),
    heapMB: stats(heapMB),
    rssMB: stats(rssMB),
  };
}

function fmt(n) {
  return n.toFixed(2).padStart(8);
}

function print(res) {
  console.log(`\n${res.label}`);
  console.log(
    `  require time (ms):  mean ${fmt(res.loadMs.mean)}  median ${fmt(
      res.loadMs.median,
    )}  min ${fmt(res.loadMs.min)}  max ${fmt(res.loadMs.max)}`,
  );
  console.log(
    `  heapUsed  (MB):     mean ${fmt(res.heapMB.mean)}  median ${fmt(
      res.heapMB.median,
    )}`,
  );
  console.log(
    `  rss       (MB):     mean ${fmt(res.rssMB.mean)}  median ${fmt(
      res.rssMB.median,
    )}`,
  );
}

console.log(`Benchmarking @sentry/node eager load over ${RUNS} runs...`);

const eager = bench('BEFORE (eager): require("@sentry/node") at boot', EAGER_CHILD);
const lazy = bench('AFTER (lazy, Sentry disabled): no require at boot', LAZY_CHILD);

print(eager);
print(lazy);

const savedMs = eager.loadMs.mean - lazy.loadMs.mean;
const savedHeap = eager.heapMB.mean - lazy.heapMB.mean;
const savedRss = eager.rssMB.mean - lazy.rssMB.mean;

console.log('\nStartup work removed when Sentry is disabled (SENTRY_DSN unset):');
console.log(`  time saved:     ${savedMs.toFixed(2)} ms`);
console.log(`  heapUsed saved: ${savedHeap.toFixed(2)} MB`);
console.log(`  rss saved:      ${savedRss.toFixed(2)} MB`);
