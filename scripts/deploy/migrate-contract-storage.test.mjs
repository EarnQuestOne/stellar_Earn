import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { migrateStateSnapshot, runCli } from "./migrate-contract-storage.mjs";

function legacySnapshot() {
  return {
    version: 1,
    quests: [
      {
        id: "quest-1",
        creator: "GCREATOR",
        reward_asset: "GTOKEN",
        created_at: 1710000000,
        metadata: {
          title: "Ship quest",
          description: "Ship schema migration",
          category: "dev",
          requirements: ["tests"],
          tags: ["migration", "schema"],
        },
        escrow: {
          balance: 5000,
          created_at: 1710000001,
        },
      },
    ],
    platform_stats: {
      total_quests_created: 4,
      total_submissions: 8,
      total_rewards_distributed: 9000,
      total_active_users: 3,
      total_rewards_claimed: 2,
    },
  };
}

test("migrateStateSnapshot plans schema splits and version bump", () => {
  const plan = migrateStateSnapshot(legacySnapshot());

  assert.equal(plan.sourceVersion, 1);
  assert.equal(plan.targetVersion, 2);
  assert.equal(plan.summary.metadataSplits, 1);
  assert.equal(plan.summary.escrowSplits, 1);
  assert.equal(plan.summary.platformStatsNormalized, 1);
  assert.equal(plan.summary.versionBumps, 1);
  assert.ok(
    plan.actions.some((action) => action.includes("split legacy metadata")),
  );
  assert.ok(
    plan.actions.some((action) => action.includes("split legacy escrow")),
  );
  assert.deepEqual(plan.migrated.quests[0].metadata_core, {
    title: "Ship quest",
    description: "Ship schema migration",
    category: "dev",
  });
  assert.deepEqual(plan.migrated.quests[0].metadata_extended, {
    requirements: ["tests"],
    tags: ["migration", "schema"],
  });
  assert.deepEqual(plan.migrated.quests[0].escrow_balances, {
    total_deposited: 5000,
    total_paid_out: 0,
    total_refunded: 0,
    is_active: true,
    deposit_count: 1,
  });
  assert.deepEqual(plan.migrated.platform_counters, {
    quests_created: 4,
    submissions: 8,
    rewards_distributed: 9000,
    active_users: 3,
    rewards_claimed: 2,
  });
});

test("dry-run mode leaves the input snapshot untouched", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "earnquest-migration-"));
  const inputPath = path.join(tempDir, "state.json");
  const before = `${JSON.stringify(legacySnapshot(), null, 2)}\n`;
  await writeFile(inputPath, before, "utf8");

  const originalStat = await stat(inputPath);
  const exitCode = await runCli(["--input", inputPath, "--dry-run"]);

  assert.equal(exitCode, 0);
  const after = await readFile(inputPath, "utf8");
  const afterStat = await stat(inputPath);
  assert.equal(after, before);
  assert.equal(afterStat.mtimeMs, originalStat.mtimeMs);
});

test("write mode emits migrated snapshot to the output path", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "earnquest-migration-"));
  const inputPath = path.join(tempDir, "state.json");
  const outputPath = path.join(tempDir, "state.v2.json");
  await writeFile(
    inputPath,
    `${JSON.stringify(legacySnapshot(), null, 2)}\n`,
    "utf8",
  );

  const exitCode = await runCli([
    "--input",
    inputPath,
    "--output",
    outputPath,
    "--write",
  ]);

  assert.equal(exitCode, 0);
  const migrated = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(migrated.schema_version, 2);
  assert.ok(!("version" in migrated));
  assert.ok(!("metadata" in migrated.quests[0]));
  assert.ok(!("escrow" in migrated.quests[0]));
  assert.ok("metadata_core" in migrated.quests[0]);
  assert.ok("escrow_meta" in migrated.quests[0]);
  assert.ok("platform_counters" in migrated);
});
