#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CURRENT_SCHEMA_VERSION = 2;

function parseArgs(argv) {
  const options = {
    dryRun: false,
    write: false,
    input: "",
    output: "",
    targetVersion: CURRENT_SCHEMA_VERSION,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--input":
        options.input = argv[++i] ?? "";
        break;
      case "--output":
        options.output = argv[++i] ?? "";
        break;
      case "--target-version":
        options.targetVersion = Number(argv[++i] ?? CURRENT_SCHEMA_VERSION);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--write":
        options.write = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function usage() {
  return `Usage:
  node scripts/deploy/migrate-contract-storage.mjs --input <state.json> --dry-run
  node scripts/deploy/migrate-contract-storage.mjs --input <state.json> --output <migrated.json> --write

Options:
  --input <path>           Path to exported contract state JSON
  --output <path>          Output path for migrated JSON (required with --write)
  --target-version <n>     Target schema version (default: ${CURRENT_SCHEMA_VERSION})
  --dry-run                Preview migration plan without writing files
  --write                  Apply migration and write migrated JSON
  --help, -h               Show this help text
`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toCoreMetadata(metadata = {}) {
  return {
    title: metadata.title ?? "",
    description: metadata.description ?? "",
    category: metadata.category ?? "",
  };
}

function toExtendedMetadata(metadata = {}) {
  return {
    requirements: Array.isArray(metadata.requirements)
      ? metadata.requirements
      : [],
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
  };
}

function splitEscrow(quest = {}) {
  const legacyEscrow = quest.escrow ?? {};
  const rewardAsset = quest.reward_asset ?? legacyEscrow.token ?? null;
  const depositor = legacyEscrow.depositor ?? quest.creator ?? null;
  const totalDeposited =
    legacyEscrow.total_deposited ?? legacyEscrow.balance ?? 0;
  const totalPaidOut = legacyEscrow.total_paid_out ?? 0;
  const totalRefunded = legacyEscrow.total_refunded ?? 0;

  return {
    escrow_balances: {
      total_deposited: totalDeposited,
      total_paid_out: totalPaidOut,
      total_refunded: totalRefunded,
      is_active:
        legacyEscrow.is_active ?? totalDeposited > totalPaidOut + totalRefunded,
      deposit_count: legacyEscrow.deposit_count ?? (totalDeposited > 0 ? 1 : 0),
    },
    escrow_meta: {
      depositor,
      token: rewardAsset,
      created_at: legacyEscrow.created_at ?? quest.created_at ?? 0,
    },
  };
}

function normalizePlatformCounters(platformStats = {}) {
  return {
    quests_created: platformStats.total_quests_created ?? 0,
    submissions: platformStats.total_submissions ?? 0,
    rewards_distributed: platformStats.total_rewards_distributed ?? 0,
    active_users: platformStats.total_active_users ?? 0,
    rewards_claimed: platformStats.total_rewards_claimed ?? 0,
  };
}

export function migrateStateSnapshot(
  sourceState,
  targetVersion = CURRENT_SCHEMA_VERSION,
) {
  if (
    !Number.isInteger(targetVersion) ||
    targetVersion < CURRENT_SCHEMA_VERSION
  ) {
    throw new Error(`Unsupported target schema version: ${targetVersion}`);
  }

  const sourceVersion = sourceState.schema_version ?? sourceState.version ?? 1;
  if (sourceVersion > targetVersion) {
    throw new Error(
      `Source schema version ${sourceVersion} is newer than target version ${targetVersion}`,
    );
  }

  const migrated = deepClone(sourceState);
  const actions = [];
  const summary = {
    questsScanned: Array.isArray(sourceState.quests)
      ? sourceState.quests.length
      : 0,
    metadataSplits: 0,
    escrowSplits: 0,
    platformStatsNormalized: 0,
    versionBumps: 0,
  };

  if (!Array.isArray(migrated.quests)) {
    migrated.quests = [];
  }

  migrated.quests = migrated.quests.map((quest) => {
    const nextQuest = { ...quest };

    if (
      nextQuest.metadata &&
      !nextQuest.metadata_core &&
      !nextQuest.metadata_extended
    ) {
      nextQuest.metadata_core = toCoreMetadata(nextQuest.metadata);
      nextQuest.metadata_extended = toExtendedMetadata(nextQuest.metadata);
      delete nextQuest.metadata;
      summary.metadataSplits += 1;
      actions.push(
        `quest:${nextQuest.id ?? "<unknown>"} split legacy metadata into metadata_core + metadata_extended`,
      );
    }

    if (
      nextQuest.escrow &&
      !nextQuest.escrow_balances &&
      !nextQuest.escrow_meta
    ) {
      const { escrow_balances, escrow_meta } = splitEscrow(nextQuest);
      nextQuest.escrow_balances = escrow_balances;
      nextQuest.escrow_meta = escrow_meta;
      delete nextQuest.escrow;
      summary.escrowSplits += 1;
      actions.push(
        `quest:${nextQuest.id ?? "<unknown>"} split legacy escrow into escrow_balances + escrow_meta`,
      );
    }

    return nextQuest;
  });

  if (migrated.platform_stats && !migrated.platform_counters) {
    migrated.platform_counters = normalizePlatformCounters(
      migrated.platform_stats,
    );
    delete migrated.platform_stats;
    summary.platformStatsNormalized += 1;
    actions.push("platform_stats normalized into platform_counters");
  }

  if (sourceVersion !== targetVersion) {
    migrated.schema_version = targetVersion;
    delete migrated.version;
    summary.versionBumps += 1;
    actions.push(
      `schema_version bumped from ${sourceVersion} to ${targetVersion}`,
    );
  }

  return {
    sourceVersion,
    targetVersion,
    actions,
    summary,
    migrated,
  };
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usage());
    return 0;
  }

  if (!options.input) {
    throw new Error("--input is required");
  }

  if (options.write && !options.output) {
    throw new Error("--output is required when --write is used");
  }

  if (!options.dryRun && !options.write) {
    throw new Error("Choose one mode: --dry-run or --write");
  }

  const inputPath = path.resolve(options.input);
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const plan = migrateStateSnapshot(parsed, options.targetVersion);

  process.stdout.write("EarnQuest Storage Migration Plan\n");
  process.stdout.write(`Input: ${inputPath}\n`);
  process.stdout.write(`Source schema version: ${plan.sourceVersion}\n`);
  process.stdout.write(`Target schema version: ${plan.targetVersion}\n`);
  process.stdout.write(`Quests scanned: ${plan.summary.questsScanned}\n`);
  process.stdout.write(`Metadata splits: ${plan.summary.metadataSplits}\n`);
  process.stdout.write(`Escrow splits: ${plan.summary.escrowSplits}\n`);
  process.stdout.write(
    `Platform stats normalizations: ${plan.summary.platformStatsNormalized}\n`,
  );
  process.stdout.write(`Version bumps: ${plan.summary.versionBumps}\n`);

  if (plan.actions.length === 0) {
    process.stdout.write(
      "Actions:\n- none; snapshot already matches target schema\n",
    );
  } else {
    process.stdout.write("Actions:\n");
    for (const action of plan.actions) {
      process.stdout.write(`- ${action}\n`);
    }
  }

  if (options.dryRun) {
    process.stdout.write("Dry-run complete. No files were modified.\n");
    return 0;
  }

  const outputPath = path.resolve(options.output);
  await writeFile(
    outputPath,
    `${JSON.stringify(plan.migrated, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Migration applied. Wrote migrated snapshot to ${outputPath}\n`,
  );
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
