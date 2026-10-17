#!/usr/bin/env node
/**
 * verify-ci-scripts.js
 *
 * Verifies that any `npm|pnpm|yarn (run) <script>` referenced in GitHub workflow
 * `run:` commands exists in at least one workspace package.json.
 *
 * No external dependencies (Node >= 18).
 */

const fs = require("node:fs");
const path = require("node:path");

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const fix = argv.includes("--fix");


// For tests we allow overriding the repo root.
const ROOT = process.env.VERIFY_CI_ROOT || path.resolve(__dirname, "..");
const WORKFLOW_DIR = path.join(ROOT, ".github", "workflows");

const WORKSPACE_PACKAGE_JSON_PATHS = [
  path.join(ROOT, "FrontEnd", "my-app", "package.json"),
  path.join(ROOT, "BackEnd", "package.json"),
  path.join(ROOT, "apps", "web", "package.json"),
  path.join(ROOT, "apps", "api", "package.json"),
  path.join(ROOT, "package.json"),
];

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${filePath}`);
  }
}

function listWorkflowFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listWorkflowFiles(p));
    else if (entry.isFile() && (p.endsWith(".yml") || p.endsWith(".yaml"))) files.push(p);
  }
  return files;
}

function extractScriptsFromWorkflow(content) {
  const scripts = new Set();

  // `npm|pnpm|yarn run <script>` (supports optional pnpm --filter <pkg>)
  const runRe =
    /(?:npm|pnpm|yarn)\s+(?:--filter\s+\S+\s+)?run\s+([\w:.-]+)/g;
  let m;
  while ((m = runRe.exec(content)) !== null) scripts.add(m[1]);

  // pnpm shorthand (pnpm lint, pnpm typecheck, npm test, etc.)
  const shorthandRe =
    /(?:npm|pnpm)\s+(lint|test|build|typecheck|format|test:e2e|test:cov)\b/g;
  while ((m = shorthandRe.exec(content)) !== null) scripts.add(m[1]);

  return scripts;
}

function buildScriptIndex() {
  const scriptToPackages = new Map();

  for (const pkgPath of WORKSPACE_PACKAGE_JSON_PATHS) {
    const pkg = readJsonIfExists(pkgPath);
    if (!pkg || !pkg.scripts) continue;
    for (const [name] of Object.entries(pkg.scripts)) {
      if (!scriptToPackages.has(name)) scriptToPackages.set(name, []);
      scriptToPackages.get(name).push(pkgPath);
    }
  }

  return scriptToPackages;
}

function main() {
  const workflowFiles = listWorkflowFiles(WORKFLOW_DIR);
  if (workflowFiles.length === 0) {
    process.stdout.write("No workflow files found; skipping verification.\n");
    process.exit(0);
  }

  const referenced = new Set();
  for (const file of workflowFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const s of extractScriptsFromWorkflow(content)) referenced.add(s);
  }

  const index = buildScriptIndex();
  const missing = [];
  for (const scriptName of referenced) {
    if (!index.has(scriptName)) missing.push(scriptName);
  }

  if (missing.length === 0) {
    process.stdout.write(
      `✅ CI script verification passed (${referenced.size} scripts referenced).\n`,
    );
    process.exit(0);
  }

  process.stdout.write(
    `❌ Missing ${missing.length} script(s) referenced by workflows:\n`,
  );
  for (const s of missing) process.stdout.write(`- ${s}\n`);

  if (fix) {
    process.stdout.write("\nSuggested stubs:\n");
    for (const s of missing) {
      process.stdout.write(
        `\n# Add to an appropriate package.json\n` +
          `"${s}": "echo TODO: implement ${s}"\n`,
      );
    }
  }

  if (dryRun) process.exit(1);
  process.exit(1);
}

main();

