const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  createContext,
  runDetector,
} = require("../scripts/check-orphaned-scripts");

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orphan-test-"));
}

function writeFile(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return full;
}

function testNoOrphans() {
  const tmp = mkdtemp();
  try {
    writeFile(tmp, "scripts/foo.sh", "#!/bin/sh\necho hi");
    writeFile(tmp, "README.md", "This repo uses scripts/foo.sh in docs");
    const ctx = createContext(tmp, ["scripts"]);
    const res = runDetector(ctx);
    assert.strictEqual(res.ok, true, "Expected no orphaned scripts");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function testHasOrphan() {
  const tmp = mkdtemp();
  try {
    writeFile(tmp, "scripts/orphan.sh", "#!/bin/sh\necho orphan");
    writeFile(tmp, "somefile.txt", "no references here");
    const ctx = createContext(tmp, ["scripts"]);
    const res = runDetector(ctx);
    assert.strictEqual(res.ok, false, "Expected orphaned scripts detected");
    const normalized = res.orphaned.map((p) => p.replace(/\\/g, "/"));
    assert.ok(
      Array.isArray(res.orphaned) && normalized.includes("scripts/orphan.sh"),
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runAll() {
  testNoOrphans();
  testHasOrphan();
}

module.exports = { runAll };
