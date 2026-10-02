const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildReleasePackage,
} = require("../contracts/earn-quest/scripts/package-release");

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "release-package-test-"));
}

function writeJson(root, rel, value) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2) + "\n", "utf8");
  return full;
}

function writeFile(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return full;
}

function testBuildReleasePackage() {
  const tmp = mkdtemp();
  try {
    writeFile(
      tmp,
      "target/wasm32-unknown-unknown/release/earn_quest.wasm",
      "fake-wasm-binary-",
    );
    writeJson(
      tmp,
      "target/wasm32-unknown-unknown/release/earn_quest.wasm.provenance.json",
      {
        schemaVersion: "1.0",
        generatedAt: new Date().toISOString(),
        repository: "test/repo",
        commit: "a".repeat(40),
        buildCommand: "cargo build --release --target wasm32-unknown-unknown",
        target: "wasm32-unknown-unknown",
        toolchain: "rustc 1.0.0",
        artifact: "target/wasm32-unknown-unknown/release/earn_quest.wasm",
        artifactSizeBytes: 17,
        artifactHash: crypto
          .createHash("sha256")
          .update("fake-wasm-binary-")
          .digest("hex"),
        artifactHashAlgorithm: "sha256",
      },
    );

    const result = buildReleasePackage(tmp);
    const manifest = JSON.parse(fs.readFileSync(result.metadataPath, "utf8"));
    const checksum = fs.readFileSync(result.checksumPath, "utf8");

    assert.strictEqual(path.basename(result.releaseDir), "release");
    assert.strictEqual(manifest.artifact, "earn_quest.wasm");
    assert.strictEqual(manifest.artifactSizeBytes, 17);
    assert.strictEqual(
      manifest.artifactHash,
      crypto.createHash("sha256").update("fake-wasm-binary-").digest("hex"),
    );
    assert.ok(checksum.includes("earn_quest.wasm"));
    assert.ok(
      fs.existsSync(result.releaseWasm),
      "WASM artifact should be copied into release directory",
    );
    assert.ok(
      fs.existsSync(result.releaseProvenance),
      "Provenance file should be copied into release directory",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function runAll() {
  testBuildReleasePackage();
}

module.exports = { runAll };
