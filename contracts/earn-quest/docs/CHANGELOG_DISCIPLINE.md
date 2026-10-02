# EarnQuest Smart Contract Changelog Discipline Policy

This document defines how EarnQuest contract changes are recorded, with extra discipline around contract-breaking changes that can disrupt storage compatibility, indexers, or public integrations.

Maintaining a precise changelog protects frontend consumers, indexer operators, auditors, and release managers from silent contract drift.

---

## Why This Matters

Unlike a typical library upgrade, contract changes affect persistent state and off-chain consumers immediately:

- **State deserialization failures** can occur if stored data shapes change without a migration path.
- **Indexer regressions** can occur if event topics or payload layouts change unexpectedly.
- **Interface breaks** can occur if public contract methods are removed, renamed, or materially redefined.

For that reason, every contract-facing change needs changelog coverage before merge, not as a cleanup task afterward.

---

## SemVer Rules For Contracts

EarnQuest follows [Semantic Versioning 2.0.0](https://semver.org/) with contract-specific interpretation:

| Version            | Meaning                     | Examples                                                                                                           |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `MAJOR` (`vX.0.0`) | Contract-breaking change    | Changing stored struct shapes, renaming public methods, altering event field order, or changing legacy key formats |
| `MINOR` (`v1.Y.0`) | Backward-compatible feature | Adding new endpoints, new event types, or optional fields that preserve existing decoding paths                    |
| `PATCH` (`v1.0.Z`) | Backward-compatible fix     | Internal bug fixes, safe refactors, validation updates, performance work, or documentation-only changes            |

If a change would force a state migration, indexer update, or integration code change, treat it as breaking.

---

## Commit And PR Discipline

EarnQuest uses [Conventional Commits](https://www.conventionalcommits.org/). For contract-breaking changes, the PR title or commit history must clearly mark the break:

```text
feat(storage)!: split legacy metadata into core and extended entries
```

Breaking contract changes must also include a `BREAKING CHANGE:` explanation in the commit history or PR body:

```text
BREAKING CHANGE: Legacy quest metadata snapshots must be migrated before deploying the new WASM.
```

This metadata is enforced in CI by [scripts/check-contract-changelog-discipline.js](../../../scripts/check-contract-changelog-discipline.js).

---

## Changelog Format

The contract changelog lives at [contracts/earn-quest/CHANGELOG.md](../CHANGELOG.md) and follows **Keep a Changelog**.

Every active PR should update the `## [Unreleased]` section. Use the normal headings when applicable:

- `### Added`
- `### Changed`
- `### Deprecated`
- `### Removed`
- `### Fixed`
- `### Security`
- `### Breaking Changes`

### Required Breaking Change Entry Format

Every entry inside `### Breaking Changes` must follow this structure:

```md
#### Storage - Split quest metadata layout

- **Impact**: Existing snapshots cannot be decoded by the new contract without migration.
- **Affected Files**: [storage.rs](../src/storage.rs), [lib.rs](../src/lib.rs)
- **Migration Required**: Run the storage migration script against the exported snapshot before deploying the new contract build.
```

This keeps release notes actionable for both on-chain and off-chain operators.

---

## Release Workflow

1. Implement the contract change.
2. Decide whether the change is backward-compatible or contract-breaking.
3. Update [CHANGELOG.md](../CHANGELOG.md) under `## [Unreleased]` in the same PR.
4. If the change is breaking, include Conventional Commit breaking metadata and a `BREAKING CHANGE:` explanation.
5. If storage changes are breaking, update the migration tooling under `scripts/deploy/` and verify the dry-run path.
6. Ensure the relevant upgrade or compatibility tests still pass before requesting review.

---

## Reviewer Checklist

When reviewing a contract PR, confirm all of the following:

- `contracts/earn-quest/CHANGELOG.md` was updated whenever `contracts/earn-quest/src/**` changed.
- Breaking changes appear under `## [Unreleased]` -> `### Breaking Changes`.
- Breaking entries include impact, affected files, and migration steps.
- Breaking PR metadata includes `!` and a `BREAKING CHANGE:` explanation.
- Migration scripts and compatibility tests were updated when storage layout changed.
