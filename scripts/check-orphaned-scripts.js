#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const defaultScriptDirs = ["scripts", "BackEnd/scripts"];
const scriptExtensions = [".sh", ".ps1", ".ts", ".js", ".bash"];
const ignoreDirs = new Set([".git", "node_modules", "build", "dist", "target"]);

function createContext(
  repoRoot = process.cwd(),
  scriptDirs = defaultScriptDirs,
) {
  return { repoRoot, scriptDirs };
}

function isTextFile(file) {
  const binExt = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".pdf",
    ".wasm",
    ".zip",
    ".tar",
    ".gz",
  ];
  return !binExt.includes(path.extname(file).toLowerCase());
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    const name = ent.name;
    if (ignoreDirs.has(name)) continue;
    const full = path.join(dir, name);
    if (ent.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function collectScriptFiles(ctx) {
  const { repoRoot, scriptDirs } = ctx;
  const found = [];
  for (const d of scriptDirs) {
    const fullDir = path.join(repoRoot, d);
    if (!fs.existsSync(fullDir)) continue;
    const files = walk(fullDir);
    for (const f of files) {
      if (scriptExtensions.includes(path.extname(f)))
        found.push(path.relative(repoRoot, f));
    }
  }
  return found;
}

function fileContains(filePath, needle) {
  try {
    if (!isTextFile(filePath)) return false;
    const content = fs.readFileSync(filePath, "utf8");
    return content.includes(needle);
  } catch (e) {
    return false;
  }
}

function findReferences(scriptPath, ctx, allFiles) {
  const { repoRoot } = ctx;
  const basename = path.basename(scriptPath);
  const candidates = [scriptPath, basename, scriptPath.replace(/\\\\/g, "/")];
  const refs = [];
  for (const f of allFiles) {
    if (path.relative(repoRoot, f) === scriptPath) continue;
    for (const c of candidates) {
      if (fileContains(f, c)) {
        refs.push({ file: path.relative(repoRoot, f), match: c });
        break;
      }
    }
  }
  return refs;
}

function runDetector(ctx) {
  const scripts = collectScriptFiles(ctx);
  if (scripts.length === 0) {
    console.log("No scripts found in", ctx.scriptDirs.join(", "));
    return { ok: true, orphaned: [] };
  }

  const allFiles = walk(ctx.repoRoot).map((p) =>
    path.relative(ctx.repoRoot, p),
  );
  const textFiles = allFiles.filter((p) => isTextFile(p));

  const orphaned = [];
  for (const s of scripts) {
    const refs = findReferences(
      s,
      ctx,
      textFiles.map((p) => path.join(ctx.repoRoot, p)).filter(Boolean),
    );
    if (refs.length === 0) orphaned.push(s);
  }

  if (orphaned.length > 0) {
    return { ok: false, orphaned };
  }

  return { ok: true, orphaned: [] };
}

if (require.main === module) {
  const ctx = createContext();
  const res = runDetector(ctx);
  if (!res.ok) {
    console.error("\nFound orphaned scripts (no references found):");
    for (const o of res.orphaned) console.error(" -", o);
    console.error(
      "\nFailing CI. If these scripts are intentionally standalone, update the CI guard to allow-list them or add references.",
    );
    process.exit(1);
  }
  console.log("✅ No orphaned scripts found");
}

module.exports = {
  createContext,
  collectScriptFiles,
  findReferences,
  runDetector,
  isTextFile,
  walk,
};
