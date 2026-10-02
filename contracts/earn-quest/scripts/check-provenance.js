#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const projectRoot = path.resolve(__dirname, "..");
const artifactPath = path.resolve(
  projectRoot,
  "target/wasm32-unknown-unknown/release/earn_quest.wasm",
);
const provenancePath = `${artifactPath}.provenance.json`;

if (!fs.existsSync(artifactPath)) {
  console.error(`Artifact not found: ${artifactPath}`);
  process.exit(1);
}
if (!fs.existsSync(provenancePath)) {
  console.error(`Provenance file not found: ${provenancePath}`);
  process.exit(1);
}

const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
assert.strictEqual(
  provenance.schemaVersion,
  "1.0",
  "schemaVersion must be 1.0",
);
assert.ok(
  typeof provenance.repository === "string" && provenance.repository.length > 0,
  "repository must be set",
);
assert.ok(
  typeof provenance.commit === "string" && provenance.commit.length === 40,
  "commit must be a 40-character git sha",
);
assert.ok(
  typeof provenance.buildCommand === "string" &&
    provenance.buildCommand.length > 0,
  "buildCommand must be set",
);
assert.strictEqual(
  provenance.target,
  "wasm32-unknown-unknown",
  "target must be wasm32-unknown-unknown",
);
assert.ok(
  typeof provenance.toolchain === "string" && provenance.toolchain.length > 0,
  "toolchain must be set",
);
assert.ok(
  typeof provenance.artifact === "string" &&
    provenance.artifact.endsWith("earn_quest.wasm"),
  "artifact must reference earn_quest.wasm",
);
assert.ok(
  typeof provenance.artifactHash === "string" &&
    /^[0-9a-f]{64}$/.test(provenance.artifactHash),
  "artifactHash must be a valid sha256 digest",
);
assert.ok(
  typeof provenance.artifactSizeBytes === "number" &&
    provenance.artifactSizeBytes > 0,
  "artifactSizeBytes must be positive",
);
assert.ok(
  typeof provenance.generatedAt === "string" &&
    provenance.generatedAt.length > 0,
  "generatedAt must be set",
);

const artifactData = fs.readFileSync(artifactPath);
const actualHash = require("crypto")
  .createHash("sha256")
  .update(artifactData)
  .digest("hex");
assert.strictEqual(
  actualHash,
  provenance.artifactHash,
  "Artifact hash must match provenance hash",
);

console.log("Provenance attestation validation passed.");
