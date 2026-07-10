#!/usr/bin/env node
/**
 * Backend module-level changelog automation (BE-134).
 *
 * Backend features live under `BackEnd/src/modules/<module>/`. Each module
 * owns its own `CHANGELOG.md` so it can be released independently. This tool:
 *
 *   1. `check`    — discipline gate: any PR that touches a module's
 *                   implementation must update that module's CHANGELOG.md in
 *                   the same PR (and breaking changes must be structured).
 *   2. `generate` — automation: parses Conventional Commits in a range, groups
 *                   them per module by commit scope, and upserts categorised
 *                   entries into each module's `## [Unreleased]` section
 *                   (creating the file from a Keep-a-Changelog template if
 *                   missing). Use `--dry-run` to preview without writing.
 *
 * The logic is exported as pure functions so it can be unit tested without git.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MODULES_ROOT = 'BackEnd/src/modules';
const ZERO_SHA_PATTERN = /^0+$/;

/** Conventional-commit type -> Keep a Changelog category. */
const TYPE_TO_CATEGORY = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Changed',
  refactor: 'Changed',
  revert: 'Removed',
  deprecate: 'Deprecated',
};

const CATEGORY_ORDER = [
  'Added',
  'Changed',
  'Deprecated',
  'Removed',
  'Fixed',
  'Security',
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/** Files that count as a module's public/implementation surface. */
function isImplementationFile(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized.startsWith(`${MODULES_ROOT}/`)) {
    return false;
  }
  if (/\.spec\.ts$|\.test\.ts$/.test(normalized)) {
    return false;
  }
  if (/\/CHANGELOG\.md$/i.test(normalized)) {
    return false;
  }
  return true;
}

/** Returns the module name a path belongs to, or null. */
function moduleOf(filePath) {
  const normalized = normalizePath(filePath);
  const prefix = `${MODULES_ROOT}/`;
  if (!normalized.startsWith(prefix)) {
    return null;
  }
  const rest = normalized.slice(prefix.length);
  const segment = rest.split('/')[0];
  return segment || null;
}

function changelogPathForModule(moduleName) {
  return `${MODULES_ROOT}/${moduleName}/CHANGELOG.md`;
}

/** Modules whose implementation files were touched. */
function getAffectedModules(changedFiles) {
  const modules = new Set();
  for (const file of changedFiles) {
    if (isImplementationFile(file)) {
      const name = moduleOf(file);
      if (name) {
        modules.add(name);
      }
    }
  }
  return [...modules].sort();
}

function wasModuleChangelogUpdated(changedFiles, moduleName) {
  const target = changelogPathForModule(moduleName);
  return changedFiles.map(normalizePath).includes(target);
}

function isBreakingConventionalHeader(line) {
  return /^[a-z]+(?:\([^)]+\))?!: .+/.test((line || '').trim());
}

function hasBreakingFooter(text) {
  return /(^|\r?\n)BREAKING CHANGE: .+/.test(text || '');
}

/** Parses a `git log %B` blob (commits separated by ---END---) into headers. */
function parseConventionalCommits(commitMessages) {
  const blocks = (commitMessages || '')
    .split(/---END---/)
    .map((block) => block.trim())
    .filter(Boolean);

  const commits = [];
  for (const block of blocks) {
    const header = block.split(/\r?\n/)[0].trim();
    const match = header.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
    if (!match) {
      continue;
    }
    const [, type, scope, bang, subject] = match;
    commits.push({
      type,
      scope: scope || null,
      breaking: Boolean(bang) || hasBreakingFooter(block),
      subject: subject.trim(),
      body: block,
    });
  }
  return commits;
}

function categoryForType(type) {
  return TYPE_TO_CATEGORY[type] || 'Changed';
}

/**
 * Groups commits by the module named in their scope. Commits whose scope does
 * not match a known module are returned under `unscoped`.
 */
function groupCommitsByModule(commits, knownModules) {
  const known = new Set(knownModules);
  const byModule = {};
  const unscoped = [];

  for (const commit of commits) {
    if (commit.scope && known.has(commit.scope)) {
      byModule[commit.scope] = byModule[commit.scope] || [];
      byModule[commit.scope].push(commit);
    } else {
      unscoped.push(commit);
    }
  }
  return { byModule, unscoped };
}

/** Builds the categorised markdown body for a module's Unreleased section. */
function buildUnreleasedBody(commits) {
  const buckets = {};
  for (const commit of commits) {
    const category = commit.breaking ? 'Changed' : categoryForType(commit.type);
    buckets[category] = buckets[category] || [];
    const prefix = commit.breaking ? '**BREAKING** ' : '';
    buckets[category].push(`- ${prefix}${commit.subject}`);
  }

  const sections = [];
  for (const category of CATEGORY_ORDER) {
    if (buckets[category] && buckets[category].length > 0) {
      sections.push(`### ${category}\n${buckets[category].join('\n')}`);
    }
  }
  return sections.join('\n\n');
}

function emptyChangelogTemplate(moduleName) {
  return `# ${moduleName} module changelog

All notable changes to the \`${moduleName}\` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
`;
}

/**
 * Inserts/merges generated entries into the `## [Unreleased]` section of an
 * existing changelog string, returning the new content. Pure (no IO).
 */
function upsertUnreleased(changelogContent, generatedBody) {
  if (!generatedBody) {
    return changelogContent;
  }
  const lines = changelogContent.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## [Unreleased]');

  if (start === -1) {
    // No Unreleased section — prepend one after the first heading block.
    return `${changelogContent.trimEnd()}\n\n## [Unreleased]\n\n${generatedBody}\n`;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^## \[/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const before = lines.slice(0, start + 1).join('\n');
  const after = lines.slice(end).join('\n');
  const merged = `${before}\n\n${generatedBody}\n`;
  return after ? `${merged}\n${after}` : `${merged}`;
}

/**
 * Discipline evaluation: any module with implementation changes must update its
 * changelog in the same PR; breaking changes must carry proper metadata.
 */
function evaluateBackendChangelogDiscipline({
  changedFiles = [],
  commitMessages = '',
  prTitle = '',
  prBody = '',
}) {
  const normalized = changedFiles.map(normalizePath);
  const affected = getAffectedModules(normalized);

  if (affected.length === 0) {
    return { ok: true, errors: [], details: { checked: false, affected } };
  }

  const errors = [];
  for (const moduleName of affected) {
    if (!wasModuleChangelogUpdated(normalized, moduleName)) {
      errors.push(
        `Changes to the "${moduleName}" module require an update to ${changelogPathForModule(
          moduleName,
        )} in the same PR.`,
      );
    }
  }

  const commitLines = (commitMessages || '').split(/\r?\n/);
  const breakingSignal =
    isBreakingConventionalHeader(prTitle) ||
    hasBreakingFooter(commitMessages) ||
    hasBreakingFooter(prBody) ||
    commitLines.some(isBreakingConventionalHeader);

  if (breakingSignal) {
    const hasMetadata =
      isBreakingConventionalHeader(prTitle) ||
      commitLines.some(isBreakingConventionalHeader);
    if (!hasMetadata) {
      errors.push(
        'Breaking module changes must use Conventional Commit breaking metadata (`type(scope)!:`).',
      );
    }
    if (!hasBreakingFooter(commitMessages) && !hasBreakingFooter(prBody)) {
      errors.push(
        'Breaking module changes must include a `BREAKING CHANGE:` explanation in the commit history or PR body.',
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    details: { checked: true, affected, breakingSignal },
  };
}

// ── git helpers (CLI only) ───────────────────────────────────────────────────

function runGit(repoRoot, args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function resolveBaseAndHead(repoRoot, options = {}) {
  let base = options.base || process.env.CHANGELOG_BASE_SHA || '';
  const head = options.head || process.env.CHANGELOG_HEAD_SHA || 'HEAD';
  if (!base || ZERO_SHA_PATTERN.test(base)) {
    base = runGit(repoRoot, ['rev-parse', `${head}^`]);
  }
  return { base, head };
}

function getChangedFiles(repoRoot, base, head) {
  const output = runGit(repoRoot, ['diff', '--name-only', `${base}...${head}`]);
  return output ? output.split(/\r?\n/).map(normalizePath).filter(Boolean) : [];
}

function getCommitMessages(repoRoot, base, head) {
  return runGit(repoRoot, ['log', '--format=%B%n---END---', `${base}..${head}`]);
}

function discoverModules(repoRoot) {
  const dir = path.join(repoRoot, MODULES_ROOT);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function parseArgs(argv) {
  const result = { command: argv[2] || 'check', dryRun: false };
  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base') {
      result.base = argv[++i];
    } else if (token === '--head') {
      result.head = argv[++i];
    } else if (token === '--dry-run') {
      result.dryRun = true;
    }
  }
  return result;
}

function runCheck(repoRoot, options) {
  let changedFiles = process.env.CHANGELOG_CHANGED_FILES
    ? process.env.CHANGELOG_CHANGED_FILES.split(/\r?\n|;/).map(normalizePath).filter(Boolean)
    : null;
  let commitMessages = process.env.CHANGELOG_COMMIT_MESSAGES || '';
  let base = options.base;
  let head = options.head;

  if (!changedFiles) {
    const range = resolveBaseAndHead(repoRoot, options);
    base = range.base;
    head = range.head;
    changedFiles = getChangedFiles(repoRoot, base, head);
    if (!commitMessages) {
      commitMessages = getCommitMessages(repoRoot, base, head);
    }
  }

  const result = evaluateBackendChangelogDiscipline({
    changedFiles,
    commitMessages,
    prTitle: process.env.CHANGELOG_PR_TITLE || '',
    prBody: process.env.CHANGELOG_PR_BODY || '',
  });

  if (!result.details.checked) {
    console.log('No backend module changes detected; changelog discipline check skipped.');
    return 0;
  }
  if (!result.ok) {
    console.error('\nBackend module changelog discipline check failed:');
    result.errors.forEach((error) => console.error(` - ${error}`));
    return 1;
  }
  console.log(
    `Backend module changelog discipline check passed (modules: ${result.details.affected.join(', ')}).`,
  );
  return 0;
}

function runGenerate(repoRoot, options) {
  const range = resolveBaseAndHead(repoRoot, options);
  const commitMessages = getCommitMessages(repoRoot, range.base, range.head);
  const commits = parseConventionalCommits(commitMessages);
  const knownModules = discoverModules(repoRoot);
  const { byModule, unscoped } = groupCommitsByModule(commits, knownModules);

  const moduleNames = Object.keys(byModule).sort();
  if (moduleNames.length === 0) {
    console.log('No module-scoped Conventional Commits found in range; nothing to generate.');
  }

  for (const moduleName of moduleNames) {
    const body = buildUnreleasedBody(byModule[moduleName]);
    const filePath = path.join(repoRoot, changelogPathForModule(moduleName));
    const existing = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf8')
      : emptyChangelogTemplate(moduleName);
    const updated = upsertUnreleased(existing, body);

    if (options.dryRun) {
      console.log(`\n--- ${changelogPathForModule(moduleName)} (dry-run) ---\n${body}`);
    } else {
      fs.writeFileSync(filePath, updated);
      console.log(`Updated ${changelogPathForModule(moduleName)} (${byModule[moduleName].length} commit(s)).`);
    }
  }

  if (unscoped.length > 0) {
    console.log(
      `\nNote: ${unscoped.length} commit(s) had no module scope and were skipped. ` +
        'Use `type(module): subject` to attribute them to a module.',
    );
  }
  return 0;
}

function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv);
  if (options.command === 'generate') {
    return runGenerate(repoRoot, options);
  }
  return runCheck(repoRoot, options);
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error('Unable to complete backend changelog automation.');
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

module.exports = {
  MODULES_ROOT,
  buildUnreleasedBody,
  categoryForType,
  changelogPathForModule,
  emptyChangelogTemplate,
  evaluateBackendChangelogDiscipline,
  getAffectedModules,
  groupCommitsByModule,
  isImplementationFile,
  moduleOf,
  normalizePath,
  parseConventionalCommits,
  upsertUnreleased,
  wasModuleChangelogUpdated,
};
