#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const artifactPath = path.resolve(
  projectRoot,
  "target/wasm32-unknown-unknown/release/earn_quest.wasm",
);

if (!fs.existsSync(artifactPath)) {
  console.error(`Artifact not found: ${artifactPath}`);
  process.exit(1);
}

const artifactData = fs.readFileSync(artifactPath);
const artifactHash = crypto
  .createHash("sha256")
  .update(artifactData)
  .digest("hex");
const artifactStat = fs.statSync(artifactPath);

const buildCommand =
  process.env.BUILD_COMMAND ||
  "cargo build --release --target wasm32-unknown-unknown";
const gitCommit =
  process.env.GITHUB_SHA ||
  execSync("git rev-parse HEAD", { cwd: projectRoot }).toString().trim();
let repository = process.env.GITHUB_REPOSITORY || "";
if (!repository) {
  try {
    const remoteUrl = execSync("git config --get remote.origin.url", {
      cwd: projectRoot,
    })
      .toString()
      .trim();
    repository = remoteUrl;
  } catch {
    repository = "unknown";
  }
}

let rustcVersion = "unknown";
try {
  rustcVersion = execSync("rustc --version", { cwd: projectRoot })
    .toString()
    .trim();
} catch {
  rustcVersion = "rustc not available";
}

const provenance = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  repository,
  commit: gitCommit,
  buildCommand,
  target: "wasm32-unknown-unknown",
  toolchain: process.env.RUSTUP_TOOLCHAIN || rustcVersion,
  os: process.platform,
  nodeVersion: process.version,
  artifact: path.relative(projectRoot, artifactPath),
  artifactSizeBytes: artifactStat.size,
  artifactHash,
  artifactHashAlgorithm: "sha256",
};

const outputPath = `${artifactPath}.provenance.json`;
fs.writeFileSync(outputPath, JSON.stringify(provenance, null, 2) + "\n");
console.log(
  `Created provenance attestation: ${path.relative(projectRoot, outputPath)}`,
);
