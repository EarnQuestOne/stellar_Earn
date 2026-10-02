#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function buildReleasePackage(projectRoot = path.resolve(__dirname, "..")) {
  const artifactPath = path.resolve(
    projectRoot,
    "target/wasm32-unknown-unknown/release/earn_quest.wasm",
  );
  const provenancePath = `${artifactPath}.provenance.json`;

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`WASM artifact not found: ${artifactPath}`);
  }
  if (!fs.existsSync(provenancePath)) {
    throw new Error(`Provenance metadata not found: ${provenancePath}`);
  }

  const artifactData = fs.readFileSync(artifactPath);
  const artifactHash = crypto
    .createHash("sha256")
    .update(artifactData)
    .digest("hex");
  const artifactSizeBytes = artifactData.length;

  const releaseDir = path.resolve(projectRoot, "release");
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });

  const releaseWasm = path.join(releaseDir, "earn_quest.wasm");
  const releaseProvenance = path.join(
    releaseDir,
    "earn_quest.wasm.provenance.json",
  );
  const checksumPath = path.join(releaseDir, "earn_quest.wasm.sha256");
  const metadataPath = path.join(releaseDir, "earn_quest.wasm.metadata.json");

  fs.copyFileSync(artifactPath, releaseWasm);
  fs.copyFileSync(provenancePath, releaseProvenance);
  fs.writeFileSync(checksumPath, `${artifactHash}  earn_quest.wasm\n`, "utf8");

  const metadata = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    artifact: "earn_quest.wasm",
    artifactPath: path.relative(projectRoot, artifactPath),
    artifactSizeBytes,
    artifactHash,
    artifactHashAlgorithm: "sha256",
    provenance: path.relative(projectRoot, provenancePath),
  };

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(metadata, null, 2) + "\n",
    "utf8",
  );

  return {
    releaseDir,
    releaseWasm,
    releaseProvenance,
    checksumPath,
    metadataPath,
  };
}

if (require.main === module) {
  try {
    const result = buildReleasePackage();
    console.log("Release package created at:", result.releaseDir);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { buildReleasePackage };
