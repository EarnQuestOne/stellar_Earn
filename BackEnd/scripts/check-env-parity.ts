import * as fs from 'fs';
import * as path from 'path';

/**
 * Checks that all keys in .env.example exist in the runtime env schema.
 * Run with: ts-node scripts/check-env-parity.ts
 */
function checkEnvParity(): void {
  const envExamplePath = path.resolve(__dirname, '../.env.example');
  const content = fs.readFileSync(envExamplePath, 'utf-8');

  const exampleKeys = content
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim());

  const missing: string[] = [];
  for (const key of exampleKeys) {
    if (!(key in process.env) && process.env[key] === undefined) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`[env-parity] Missing env vars: ${missing.join(', ')}`);
  } else {
    console.log('[env-parity] All .env.example keys are present at runtime.');
  }
}

checkEnvParity();
