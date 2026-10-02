#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CHANGELOG_PATH = "contracts/earn-quest/CHANGELOG.md";
const CONTRACT_IMPLEMENTATION_PREFIXES = ["contracts/earn-quest/src/"];
const CONTRACT_IMPLEMENTATION_FILES = new Set([
  "contracts/earn-quest/Cargo.toml",
]);
const ZERO_SHA_PATTERN = /^0+$/;

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function isContractImplementationFile(filePath) {
  const normalized = normalizePath(filePath);
  if (CONTRACT_IMPLEMENTATION_FILES.has(normalized)) {
    return true;
  }

  return CONTRACT_IMPLEMENTATION_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function hasContractImplementationChanges(changedFiles) {
  return changedFiles.some(isContractImplementationFile);
}

function wasChangelogUpdated(changedFiles) {
  return changedFiles.map(normalizePath).includes(CHANGELOG_PATH);
}

function isBreakingConventionalHeader(line) {
  return /^[a-z]+(?:\([^)]+\))?!: .+/.test((line || "").trim());
}

function hasBreakingFooter(text) {
  return /(^|\r?\n)BREAKING CHANGE: .+/.test(text || "");
}

function hasBreakingCheckbox(text) {
  return /(^|\r?\n)- \[[xX]\] Breaking change\b/.test(text || "");
}

function detectBreakingSignal({
  commitMessages = "",
  prTitle = "",
  prBody = "",
}) {
  const commitLines = commitMessages.split(/\r?\n/);
  return (
    isBreakingConventionalHeader(prTitle) ||
    hasBreakingCheckbox(prBody) ||
    hasBreakingFooter(commitMessages) ||
    commitLines.some(isBreakingConventionalHeader)
  );
}

function hasBreakingMetadata({ commitMessages = "", prTitle = "" }) {
  const commitLines = commitMessages.split(/\r?\n/);
  return (
    isBreakingConventionalHeader(prTitle) ||
    commitLines.some(isBreakingConventionalHeader)
  );
}

function extractUnreleasedSection(changelogContent) {
  const lines = (changelogContent || "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## [Unreleased]");
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^## \[/.test(lines[index])) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n");
}

function extractSubsectionBody(sectionContent, heading) {
  const lines = (sectionContent || "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^### /.test(lines[index])) {
      end = index;
      break;
    }
  }

  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

function parseBreakingEntries(sectionBody) {
  const lines = (sectionBody || "").split(/\r?\n/);
  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    if (/^#### /.test(line)) {
      if (currentEntry) {
        entries.push(currentEntry.join("\n").trim());
      }
      currentEntry = [line];
      continue;
    }

    if (currentEntry) {
      currentEntry.push(line);
    }
  }

  if (currentEntry) {
    entries.push(currentEntry.join("\n").trim());
  }

  return entries.filter(Boolean);
}

function validateBreakingEntries(changelogContent) {
  const errors = [];
  const unreleasedSection = extractUnreleasedSection(changelogContent);
  if (!unreleasedSection) {
    return {
      ok: false,
      errors: [
        "contracts/earn-quest/CHANGELOG.md must include an `## [Unreleased]` section.",
      ],
    };
  }

  const breakingBody = extractSubsectionBody(
    unreleasedSection,
    "### Breaking Changes",
  );
  if (!breakingBody) {
    return {
      ok: false,
      errors: [
        "Breaking changes must be documented under `## [Unreleased]` -> `### Breaking Changes`.",
      ],
    };
  }

  const entries = parseBreakingEntries(breakingBody);
  if (entries.length === 0) {
    return {
      ok: false,
      errors: [
        "`### Breaking Changes` must contain at least one `#### Component - Summary` entry.",
      ],
    };
  }

  entries.forEach((entry, index) => {
    const prefix = `Breaking change entry ${index + 1}`;
    if (!/^#### .+ - .+/m.test(entry)) {
      errors.push(
        `${prefix} must start with a level-4 heading in the form \`#### Component - Summary\`.`,
      );
    }
    if (!/^- \*\*Impact\*\*: .+/m.test(entry)) {
      errors.push(`${prefix} must include an \`Impact\` bullet.`);
    }
    if (!/^- \*\*Affected Files\*\*: .+/m.test(entry)) {
      errors.push(`${prefix} must include an \`Affected Files\` bullet.`);
    }
    if (!/^- \*\*Migration Required\*\*: .+/m.test(entry)) {
      errors.push(`${prefix} must include a \`Migration Required\` bullet.`);
    }
  });

  return { ok: errors.length === 0, errors };
}

function evaluateContractChangelogDiscipline({
  changedFiles = [],
  changelogContent = "",
  commitMessages = "",
  prTitle = "",
  prBody = "",
}) {
  const errors = [];
  const normalizedFiles = changedFiles.map(normalizePath);
  const hasImplementationChanges =
    hasContractImplementationChanges(normalizedFiles);

  if (!hasImplementationChanges) {
    return { ok: true, errors: [], details: { checked: false } };
  }

  if (!wasChangelogUpdated(normalizedFiles)) {
    errors.push(
      "Contract implementation changes require an update to contracts/earn-quest/CHANGELOG.md in the same PR.",
    );
  }

  const breakingSignal = detectBreakingSignal({
    commitMessages,
    prTitle,
    prBody,
  });
  if (breakingSignal) {
    if (!hasBreakingMetadata({ commitMessages, prTitle })) {
      errors.push(
        "Breaking contract changes must use Conventional Commit breaking metadata (`type(scope)!:` or equivalent PR title).",
      );
    }

    if (
      !hasBreakingFooter(commitMessages) &&
      !/BREAKING CHANGE: .+/.test(prBody || "")
    ) {
      errors.push(
        "Breaking contract changes must include a `BREAKING CHANGE:` explanation in the commit history or PR body.",
      );
    }

    const breakingValidation = validateBreakingEntries(changelogContent);
    if (!breakingValidation.ok) {
      errors.push(...breakingValidation.errors);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    details: {
      checked: true,
      hasImplementationChanges,
      breakingSignal,
    },
  };
}

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base") {
      result.base = argv[index + 1];
      index += 1;
    } else if (token === "--head") {
      result.head = argv[index + 1];
      index += 1;
    }
  }
  return result;
}

function parseChangedFilesOverride(value) {
  if (!value) {
    return null;
  }

  return value
    .split(/\r?\n|;/)
    .map((file) => normalizePath(file.trim()))
    .filter(Boolean);
}

function runGit(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveBaseAndHead(repoRoot, options = {}) {
  let base = options.base || process.env.CHANGELOG_BASE_SHA || "";
  const head = options.head || process.env.CHANGELOG_HEAD_SHA || "HEAD";

  if (!base || ZERO_SHA_PATTERN.test(base)) {
    base = runGit(repoRoot, ["rev-parse", `${head}^`]);
  }

  return { base, head };
}

function getChangedFiles(repoRoot, base, head) {
  const output = runGit(repoRoot, ["diff", "--name-only", `${base}...${head}`]);
  if (!output) {
    return [];
  }

  return output.split(/\r?\n/).map(normalizePath).filter(Boolean);
}

function getCommitMessages(repoRoot, base, head) {
  return runGit(repoRoot, [
    "log",
    "--format=%B%n---END---",
    `${base}..${head}`,
  ]);
}

function readChangelog(repoRoot) {
  return fs.readFileSync(path.join(repoRoot, CHANGELOG_PATH), "utf8");
}

function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv);
  const changedFilesOverride = parseChangedFilesOverride(
    process.env.CHANGELOG_CHANGED_FILES || "",
  );
  const changelogContent = fs.existsSync(path.join(repoRoot, CHANGELOG_PATH))
    ? readChangelog(repoRoot)
    : "";
  let changedFiles = changedFilesOverride;
  let commitMessages = process.env.CHANGELOG_COMMIT_MESSAGES || "";
  let base = process.env.CHANGELOG_BASE_SHA || options.base || "";
  let head = process.env.CHANGELOG_HEAD_SHA || options.head || "HEAD";

  if (!changedFiles) {
    const range = resolveBaseAndHead(repoRoot, options);
    base = range.base;
    head = range.head;
    changedFiles = getChangedFiles(repoRoot, base, head);
  }

  if (!commitMessages) {
    if (!base && !changedFilesOverride) {
      const range = resolveBaseAndHead(repoRoot, options);
      base = range.base;
      head = range.head;
    }
    commitMessages = base ? getCommitMessages(repoRoot, base, head) : "";
  }

  const result = evaluateContractChangelogDiscipline({
    changedFiles,
    changelogContent,
    commitMessages,
    prTitle: process.env.CHANGELOG_PR_TITLE || "",
    prBody: process.env.CHANGELOG_PR_BODY || "",
  });

  if (!result.details.checked) {
    console.log(
      "No contract implementation changes detected; changelog discipline check skipped.",
    );
    return;
  }

  if (!result.ok) {
    console.error("\nContract changelog discipline check failed:");
    for (const error of result.errors) {
      console.error(` - ${error}`);
    }
    if (base) {
      console.error(`\nCompared range: ${base}...${head}`);
    }
    process.exit(1);
  }

  console.log("Contract changelog discipline check passed.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Unable to complete contract changelog discipline check.");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

module.exports = {
  CHANGELOG_PATH,
  detectBreakingSignal,
  evaluateContractChangelogDiscipline,
  extractSubsectionBody,
  extractUnreleasedSection,
  hasBreakingCheckbox,
  hasBreakingFooter,
  hasContractImplementationChanges,
  isBreakingConventionalHeader,
  isContractImplementationFile,
  normalizePath,
  parseBreakingEntries,
  validateBreakingEntries,
  wasChangelogUpdated,
};
