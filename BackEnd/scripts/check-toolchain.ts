/**
 * check-toolchain.ts
 *
 * Onboarding preflight script that validates every tool required to develop,
 * build, and deploy the stellar_Earn backend and smart contracts.
 *
 * Usage:
 *   ts-node scripts/check-toolchain.ts
 *   npm run check:toolchain
 *   npm run onboarding
 *
 * Exit codes:
 *   0  – All required tools pass; any warnings are non-fatal.
 *   1  – One or more REQUIRED tools are missing or below minimum version.
 *
 * Behaviour:
 *   - REQUIRED tools failing → exit 1 (blocks CI and local setup)
 *   - RECOMMENDED tools failing → warning printed, exit 0
 *
 * No external runtime dependencies – uses only Node.js built-ins plus
 * ts-node (already a devDependency).
 */

import { spawnSync } from 'child_process';

// ---------------------------------------------------------------------------
// ANSI colour helpers (no chalk dependency needed)
// ---------------------------------------------------------------------------

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  dim: '\x1b[2m',
} as const;

function green(s: string): string {
  return `${COLORS.green}${s}${COLORS.reset}`;
}
function yellow(s: string): string {
  return `${COLORS.yellow}${s}${COLORS.reset}`;
}
function red(s: string): string {
  return `${COLORS.red}${s}${COLORS.reset}`;
}
function bold(s: string): string {
  return `${COLORS.bold}${s}${COLORS.reset}`;
}
function cyan(s: string): string {
  return `${COLORS.cyan}${s}${COLORS.reset}`;
}
function dim(s: string): string {
  return `${COLORS.dim}${s}${COLORS.reset}`;
}

// ---------------------------------------------------------------------------
// Version parsing & comparison
// ---------------------------------------------------------------------------

/**
 * Parses the first semver-like version (X.Y.Z) found in a string.
 * Returns [major, minor, patch] or null if not found.
 */
function parseVersion(raw: string): [number, number, number] | null {
  const match = raw.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] ?? '0', 10)];
}

/**
 * Returns true when `installed` satisfies `>= minimum`.
 * Comparison is purely numeric (major → minor → patch).
 */
function meetsMinimum(
  installed: [number, number, number],
  minimum: [number, number, number],
): boolean {
  for (let i = 0; i < 3; i++) {
    if (installed[i] > minimum[i]) return true;
    if (installed[i] < minimum[i]) return false;
  }
  return true; // exactly equal
}

function versionString(v: [number, number, number]): string {
  return v.join('.');
}

// ---------------------------------------------------------------------------
// Tool detection
// ---------------------------------------------------------------------------

interface ToolCheck {
  /** Display name for the tool */
  name: string;
  /** Whether the tool is hard required (fail) or recommended (warn) */
  required: boolean;
  /**
   * One or more command+args combinations to try in order.
   * The first one that succeeds (exit 0 or produces output) is used.
   */
  commands: Array<{ cmd: string; args: string[] }>;
  /**
   * Where to look for the version string – stdout, stderr, or both.
   * Defaults to 'stdout'.
   */
  outputSource?: 'stdout' | 'stderr' | 'both';
  /** Minimum acceptable version [major, minor, patch] */
  minVersion: [number, number, number];
  /** Human-readable minimum string shown in output */
  minVersionDisplay: string;
  /** URL or short hint for installing / upgrading the tool */
  installHint: string;
}

const TOOLS: ToolCheck[] = [
  // ── Node.js ─────────────────────────────────────────────────────────────
  {
    name: 'Node.js',
    required: true,
    commands: [{ cmd: 'node', args: ['--version'] }],
    minVersion: [22, 0, 0],
    minVersionDisplay: '22.x',
    installHint: 'https://nodejs.org/  (use nvm or fnm for version management)',
  },
  // ── npm ─────────────────────────────────────────────────────────────────
  {
    name: 'npm',
    required: true,
    commands: [{ cmd: 'npm', args: ['--version'] }],
    minVersion: [10, 0, 0],
    minVersionDisplay: '10.x',
    installHint: 'Bundled with Node.js 22+. Run: npm install -g npm@latest',
  },
  // ── Bun ─────────────────────────────────────────────────────────────────
  {
    name: 'Bun',
    required: false, // recommended – used for migration commands
    commands: [{ cmd: 'bun', args: ['--version'] }],
    minVersion: [1, 0, 0],
    minVersionDisplay: '1.x',
    installHint: 'https://bun.sh/  (curl -fsSL https://bun.sh/install | bash)',
  },
  // ── TypeScript (tsc) ────────────────────────────────────────────────────
  {
    name: 'TypeScript (tsc)',
    required: true,
    commands: [
      { cmd: 'npx', args: ['--no', 'tsc', '--version'] },
      { cmd: 'tsc', args: ['--version'] },
    ],
    minVersion: [5, 0, 0],
    minVersionDisplay: '5.x',
    installHint: 'npm install -g typescript  OR  installed as devDependency (npm ci)',
  },
  // ── Git ─────────────────────────────────────────────────────────────────
  {
    name: 'Git',
    required: true,
    commands: [{ cmd: 'git', args: ['--version'] }],
    minVersion: [2, 0, 0],
    minVersionDisplay: '2.x',
    installHint: 'https://git-scm.com/downloads',
  },
  // ── Rust (rustc) ────────────────────────────────────────────────────────
  {
    name: 'Rust (rustc)',
    required: true,
    commands: [{ cmd: 'rustc', args: ['--version'] }],
    outputSource: 'stdout',
    minVersion: [1, 80, 0],
    minVersionDisplay: '1.80.x (stable)',
    installHint:
      'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh\n' +
      '    Then: rustup default stable',
  },
  // ── Cargo ───────────────────────────────────────────────────────────────
  {
    name: 'Cargo',
    required: true,
    commands: [{ cmd: 'cargo', args: ['--version'] }],
    minVersion: [1, 80, 0],
    minVersionDisplay: '1.80.x',
    installHint: 'Installed alongside Rust via rustup (see Rust hint above)',
  },
  // ── Docker ──────────────────────────────────────────────────────────────
  {
    name: 'Docker',
    required: false, // recommended – needed for local Postgres/Redis
    commands: [{ cmd: 'docker', args: ['--version'] }],
    minVersion: [24, 0, 0],
    minVersionDisplay: '24.x',
    installHint: 'https://docs.docker.com/get-docker/',
  },
  // ── Soroban / Stellar CLI ────────────────────────────────────────────────
  {
    name: 'Stellar CLI (soroban)',
    required: false, // recommended – needed to deploy/invoke contracts
    commands: [
      { cmd: 'stellar', args: ['--version'] },  // v21+ binary name
      { cmd: 'soroban', args: ['--version'] },  // legacy binary name
    ],
    outputSource: 'both',
    minVersion: [22, 0, 0],
    minVersionDisplay: '22.x',
    installHint:
      'cargo install --locked stellar-cli@22\n' +
      '    Docs: https://developers.stellar.org/docs/smart-contracts/getting-started/setup',
  },
];

// ---------------------------------------------------------------------------
// Running checks
// ---------------------------------------------------------------------------

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckResult {
  tool: ToolCheck;
  status: CheckStatus;
  installedVersion: string | null;
  message: string;
}

function runToolCheck(tool: ToolCheck): CheckResult {
  let rawOutput: string | null = null;

  for (const { cmd, args } of tool.commands) {
    const result = spawnSync(cmd, args, {
      encoding: 'utf8',
      timeout: 10_000,
      shell: process.platform === 'win32', // needed on Windows for global cmds
    });

    const stdout = (result.stdout ?? '').trim();
    const stderr = (result.stderr ?? '').trim();

    const source = tool.outputSource ?? 'stdout';
    const combined =
      source === 'both'
        ? `${stdout} ${stderr}`.trim()
        : source === 'stderr'
          ? stderr
          : stdout;

    if (combined) {
      rawOutput = combined;
      break;
    }
  }

  if (!rawOutput) {
    // Tool is not installed / not on PATH
    const status: CheckStatus = tool.required ? 'fail' : 'warn';
    return {
      tool,
      status,
      installedVersion: null,
      message: `Not found – please install ${tool.name} ≥ ${tool.minVersionDisplay}`,
    };
  }

  const parsed = parseVersion(rawOutput);
  if (!parsed) {
    // Tool exists but version could not be parsed – treat as warn
    return {
      tool,
      status: 'warn',
      installedVersion: rawOutput.slice(0, 40),
      message: `Could not parse version from: "${rawOutput.slice(0, 60)}"`,
    };
  }

  if (!meetsMinimum(parsed, tool.minVersion)) {
    const status: CheckStatus = tool.required ? 'fail' : 'warn';
    return {
      tool,
      status,
      installedVersion: versionString(parsed),
      message: `Version ${versionString(parsed)} is below minimum ${tool.minVersionDisplay}`,
    };
  }

  return {
    tool,
    status: 'pass',
    installedVersion: versionString(parsed),
    message: `${versionString(parsed)} ✓`,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: green('  PASS  '),
  warn: yellow('  WARN  '),
  fail: red('  FAIL  '),
};

const COL_NAME = 28;
const COL_VERSION = 16;
const COL_STATUS = 10;

function padEnd(s: string, len: number): string {
  // Strip ANSI for length calculation
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
  return s + ' '.repeat(Math.max(0, len - stripped.length));
}

function printHeader(): void {
  const line = '─'.repeat(72);
  console.log('');
  console.log(bold(cyan('  stellar_Earn – Toolchain Preflight Check')));
  console.log(dim(`  Run: npm run check:toolchain  |  ${new Date().toISOString()}`));
  console.log(dim(`  ${line}`));
  console.log(
    '  ' +
      bold(padEnd('Tool', COL_NAME)) +
      bold(padEnd('Installed', COL_VERSION)) +
      bold(padEnd('Required', COL_VERSION)) +
      bold('Status'),
  );
  console.log(dim(`  ${line}`));
}

function printResult(r: CheckResult): void {
  const name = padEnd(r.tool.name, COL_NAME);
  const installed = padEnd(r.installedVersion ?? dim('not found'), COL_VERSION);
  const required = padEnd(r.tool.minVersionDisplay, COL_VERSION);
  const status = STATUS_LABEL[r.status];
  console.log(`  ${name}${installed}${required}${status}`);

  if (r.status !== 'pass') {
    console.log(dim(`    ↳ ${r.message}`));
    if (r.status === 'fail' || r.status === 'warn') {
      const hint = r.tool.installHint.split('\n');
      console.log(dim(`    ↳ Install/fix: ${hint[0]}`));
      hint.slice(1).forEach((l) => console.log(dim(`                   ${l}`)));
    }
  }
}

function printFooter(results: CheckResult[]): void {
  const passes = results.filter((r) => r.status === 'pass').length;
  const warns = results.filter((r) => r.status === 'warn').length;
  const fails = results.filter((r) => r.status === 'fail').length;
  const line = '─'.repeat(72);

  console.log(dim(`  ${line}`));
  console.log(
    `  Summary: ${green(`${passes} passed`)}  ${warns > 0 ? yellow(`${warns} warned`) : dim(`${warns} warned`)}  ${fails > 0 ? red(`${fails} failed`) : dim(`${fails} failed`)}`,
  );

  if (fails > 0) {
    console.log('');
    console.log(
      red(
        '  ✖  One or more REQUIRED tools are missing or below minimum version.',
      ),
    );
    console.log(
      red('     Please install the listed tools and re-run: npm run check:toolchain'),
    );
  } else if (warns > 0) {
    console.log('');
    console.log(
      yellow(
        '  ⚠  Some RECOMMENDED tools are missing. You can still develop the backend,',
      ),
    );
    console.log(
      yellow(
        '     but Soroban contract work and Docker-based services may not be available.',
      ),
    );
    console.log(green('  ✔  All REQUIRED tools are present. You\'re good to go!'));
  } else {
    console.log('');
    console.log(green('  ✔  All toolchain requirements satisfied. Happy coding!'));
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  printHeader();

  const results: CheckResult[] = TOOLS.map((tool) => {
    const result = runToolCheck(tool);
    printResult(result);
    return result;
  });

  printFooter(results);

  const hasFailures = results.some((r) => r.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

main();
