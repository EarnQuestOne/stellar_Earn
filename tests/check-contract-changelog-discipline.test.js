const assert = require("assert");
const {
  CHANGELOG_PATH,
  evaluateContractChangelogDiscipline,
  validateBreakingEntries,
} = require("../scripts/check-contract-changelog-discipline");

function sampleChangelog(extra = "") {
  return `# Changelog

## [Unreleased]

### Added
- Documented a normal contract improvement.

${extra}

## [1.0.0] - 2025-04-27

### Added
- Initial release.
`;
}

function testSkipsNonContractChanges() {
  const result = evaluateContractChangelogDiscipline({
    changedFiles: ["README.md"],
    changelogContent: sampleChangelog(),
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.details.checked, false);
}

function testRequiresChangelogWhenContractCodeChanges() {
  const result = evaluateContractChangelogDiscipline({
    changedFiles: ["contracts/earn-quest/src/lib.rs"],
    changelogContent: sampleChangelog(),
  });

  assert.strictEqual(result.ok, false);
  assert.ok(
    result.errors.includes(
      "Contract implementation changes require an update to contracts/earn-quest/CHANGELOG.md in the same PR.",
    ),
  );
}

function testAllowsNonBreakingContractChangesWithChangelogUpdate() {
  const result = evaluateContractChangelogDiscipline({
    changedFiles: ["contracts/earn-quest/src/lib.rs", CHANGELOG_PATH],
    changelogContent: sampleChangelog(),
    commitMessages: "feat(contract): add a backward compatible endpoint",
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.details.checked, true);
  assert.strictEqual(result.details.breakingSignal, false);
}

function testBreakingChangesRequireStructuredChangelogEntry() {
  const result = evaluateContractChangelogDiscipline({
    changedFiles: ["contracts/earn-quest/src/storage.rs", CHANGELOG_PATH],
    changelogContent: sampleChangelog(),
    commitMessages:
      "feat(storage)!: split quest metadata\n\nBREAKING CHANGE: Storage layout changed and requires a migration.",
  });

  assert.strictEqual(result.ok, false);
  assert.ok(
    result.errors.includes(
      "Breaking changes must be documented under `## [Unreleased]` -> `### Breaking Changes`.",
    ),
  );
}

function testBreakingChangesRequireMetadataWhenCheckboxTriggersValidation() {
  const changelog = sampleChangelog(`### Breaking Changes

#### Storage - Split metadata layout
- **Impact**: Existing snapshots cannot be read without migration.
- **Affected Files**: [storage.rs](contracts/earn-quest/src/storage.rs), [lib.rs](contracts/earn-quest/src/lib.rs)
- **Migration Required**: Run the storage migration script before deploying the new WASM.
`);
  const result = evaluateContractChangelogDiscipline({
    changedFiles: ["contracts/earn-quest/src/storage.rs", CHANGELOG_PATH],
    changelogContent: changelog,
    prBody:
      "## Type of Change\n- [x] Breaking change\n\nBREAKING CHANGE: Storage layout changed and requires migration.",
  });

  assert.strictEqual(result.ok, false);
  assert.ok(
    result.errors.includes(
      "Breaking contract changes must use Conventional Commit breaking metadata (`type(scope)!:` or equivalent PR title).",
    ),
  );
}

function testBreakingChangesPassWithStructuredEntryAndMetadata() {
  const changelog = sampleChangelog(`### Breaking Changes

#### Storage - Split metadata layout
- **Impact**: Existing snapshots cannot be read without migration.
- **Affected Files**: [storage.rs](contracts/earn-quest/src/storage.rs), [lib.rs](contracts/earn-quest/src/lib.rs)
- **Migration Required**: Run the storage migration script before deploying the new WASM.
`);
  const result = evaluateContractChangelogDiscipline({
    changedFiles: ["contracts/earn-quest/src/storage.rs", CHANGELOG_PATH],
    changelogContent: changelog,
    prTitle: "feat(storage)!: split metadata layout",
    prBody:
      "## Type of Change\n- [x] Breaking change\n\nBREAKING CHANGE: Storage layout changed and requires migration.",
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.details.breakingSignal, true);
}

function testBreakingEntryValidatorRequiresAllBullets() {
  const invalid = sampleChangelog(`### Breaking Changes

#### Events - Rename a topic
- **Impact**: Downstream indexers break.
- **Affected Files**: [events.rs](contracts/earn-quest/src/events.rs)
`);
  const result = validateBreakingEntries(invalid);

  assert.strictEqual(result.ok, false);
  assert.ok(
    result.errors.some((error) => error.includes("Migration Required")),
  );
}

function runAll() {
  testSkipsNonContractChanges();
  testRequiresChangelogWhenContractCodeChanges();
  testAllowsNonBreakingContractChangesWithChangelogUpdate();
  testBreakingChangesRequireStructuredChangelogEntry();
  testBreakingChangesRequireMetadataWhenCheckboxTriggersValidation();
  testBreakingChangesPassWithStructuredEntryAndMetadata();
  testBreakingEntryValidatorRequiresAllBullets();
}

module.exports = { runAll };
