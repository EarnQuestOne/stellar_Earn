import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const ENV_EXAMPLE_PATH = path.join(WORKSPACE_ROOT, '.env.example');
const VALIDATOR_PATH = path.join(WORKSPACE_ROOT, 'apps', 'web', 'src', 'utils', 'env', 'lazyEnvValidator.ts');

logInfo('Initiating .env.example configuration parity evaluation pass...');

function logInfo(msg: string) { console.log(`\x1b[34m[ENV-PARITY-CHECK]\x1b[0m ${msg}`); }
function logError(msg: string) { console.error(`\x1b[31m[PARITY-FAILURE]\x1b[0m ${msg}`); }

if (!fs.existsSync(ENV_EXAMPLE_PATH) || !fs.existsSync(VALIDATOR_PATH)) {
    logError('Required framework mapping files are missing from the workspace context.');
    process.exit(1);
}

// 1. Extract required keys from code interface definition
const validatorContent = fs.readFileSync(VALIDATOR_PATH, 'utf8');
const interfaceMatch = validatorContent.match(/export interface AppEnvironment \{([\s\S]*?)\}/);

if (!interfaceMatch) {
    logError('Could not locate structural AppEnvironment definition boundaries.');
    process.exit(1);
}

const requiredKeys: string[] = [];
const lines = interfaceMatch[1].split('\n');
lines.forEach(line => {
    // Isolate keys, ignoring optional tags (?) and boolean values
    const match = line.trim().match(/^([A-Z0-9_]+)(\?)?:/);
    if (match && !match[2]) { // If it matches and does NOT have an optional '?' modifier
        requiredKeys.push(match[1]);
    }
});

// 2. Parse keys present within the .env.example template
const exampleContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8');
const exampleKeys = new Set<string>();
exampleContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        // Accept both raw key and NEXT_PUBLIC prefixes
        const rawKey = parts[0].replace(/^NEXT_PUBLIC_/, '');
        exampleKeys.add(rawKey);
    }
});

// 3. Evaluate structural intersection parity gaps
const missingInExample = requiredKeys.filter(key => !exampleKeys.has(key));

if (missingInExample.length > 0) {
    logError('.env.example parity evaluation failed! Missing mandatory variables:');
    missingInExample.forEach(key => {
        console.error(`  ❌ Missing: ${key} (or NEXT_PUBLIC_${key})`);
    });
    logError('Action Required: Update your root .env.example file to match AppEnvironment changes.');
    process.exit(1);
}

logInfo('Success! .env.example is fully synchronized with required application properties.');
process.exit(0);