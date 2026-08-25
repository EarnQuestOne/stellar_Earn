import 'reflect-metadata';
import { performance } from 'node:perf_hooks';
import * as crypto from 'crypto';
import { verifyWebhookSignature, generateWebhookSignature } from '../src/modules/webhooks/utils/signature';

/**
 * Benchmark: cached vs uncached webhook signature verification.
 *
 * Before this change, every signature verification converted the secret string
 * to a Buffer and created a new HMAC instance. After this change, secrets are
 * cached as Buffers to avoid repeated conversion overhead.
 *
 * This script measures both paths:
 *
 *   WEBHOOK_BENCHMARK_ITERATIONS        iterations per path (default 10000)
 *
 * Run: npm run benchmark:webhook-signature
 */

interface BenchmarkResult {
  label: string;
  totalMs: number;
  opsPerSecond: number;
  perOpMs: number;
}

const iterations = Number.parseInt(
  process.env.WEBHOOK_BENCHMARK_ITERATIONS || '10000',
  10,
);

const GITHUB_SECRET = 'github-test-secret-value-for-benchmarking';
const API_SECRET = 'api-test-secret-value-for-benchmarking';
const payload = { repository: { full_name: 'org/repo' }, ref: 'refs/heads/main' };

async function run(
  label: string,
  operation: () => Promise<unknown> | unknown,
): Promise<BenchmarkResult> {
  const startedAt = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    await operation();
  }
  const totalMs = performance.now() - startedAt;
  return {
    label,
    totalMs,
    opsPerSecond: Math.round((iterations / totalMs) * 1000),
    perOpMs: Math.round((totalMs / iterations) * 100) / 100,
  };
}

// Simulate the "before" implementation without caching
function verifyGithubSignatureUncached(
  payloadString: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signature.substring(7);
  // Before: convert secret to buffer every time
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString, 'utf8');
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  );
}

function verifyApiSignatureUncached(
  payloadString: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature.startsWith('hmac-sha256=')) {
    return false;
  }

  const expectedSignature = signature.substring(12);
  // Before: convert secret to buffer every time
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString, 'utf8');
  const calculatedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  );
}

async function main(): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const githubSignature = generateWebhookSignature(payload, GITHUB_SECRET, 'github');
  const apiSignature = generateWebhookSignature(payload, API_SECRET, 'api');

  // "Before": uncached implementation (converts secret to buffer every time)
  const beforeGithub = await run('GitHub uncached (secret→buffer per call)', () =>
    verifyGithubSignatureUncached(payloadString, githubSignature, GITHUB_SECRET),
  );

  const beforeApi = await run('API uncached (secret→buffer per call)', () =>
    verifyApiSignatureUncached(payloadString, apiSignature, API_SECRET),
  );

  // "After": cached implementation (uses cached secret buffers)
  const afterGithub = await run('GitHub cached (secret buffer reused)', () =>
    verifyWebhookSignature(payload, githubSignature, GITHUB_SECRET, 'github'),
  );

  const afterApi = await run('API cached (secret buffer reused)', () =>
    verifyWebhookSignature(payload, apiSignature, API_SECRET, 'api'),
  );

  const githubSpeedup = beforeGithub.perOpMs / afterGithub.perOpMs;
  const apiSpeedup = beforeApi.perOpMs / afterApi.perOpMs;

  console.log('\n=== Webhook signature verification benchmark ===');
  console.log(`iterations: ${iterations}`);
  console.table([beforeGithub, afterGithub, beforeApi, afterApi]);
  console.log(
    `\nGitHub speedup: ${githubSpeedup.toFixed(1)}x faster (${beforeGithub.perOpMs}ms/op vs ${afterGithub.perOpMs}ms/op)`,
  );
  console.log(
    `API speedup: ${apiSpeedup.toFixed(1)}x faster (${beforeApi.perOpMs}ms/op vs ${afterApi.perOpMs}ms/op)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
