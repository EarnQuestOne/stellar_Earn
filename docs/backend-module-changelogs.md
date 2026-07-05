# Backend Module-Level Changelogs (BE-134)

Backend features live under `BackEnd/src/modules/<module>/`. Each module owns a
`CHANGELOG.md` so it can be versioned and released independently. Changelog
upkeep is automated by `scripts/backend-changelog.js`.

## Commands

```bash
# From BackEnd/ (npm scripts) or repo root (node):
npm --prefix BackEnd run changelog:check        # discipline gate (used in CI)
npm --prefix BackEnd run changelog:generate     # write Unreleased entries
node scripts/backend-changelog.js generate --base <sha> --head <sha> --dry-run
```

## How it works

- **`check`** — fails when a PR modifies a module's implementation files but does
  not update that module's `CHANGELOG.md` in the same PR. Breaking changes must
  carry Conventional Commit metadata (`type(scope)!:`) and a `BREAKING CHANGE:`
  footer. Runs automatically via
  [`.github/workflows/backend-changelog.yml`](../.github/workflows/backend-changelog.yml).
- **`generate`** — parses Conventional Commits in a range, groups them per module
  by commit **scope** (e.g. `feat(auth): …` → the `auth` module), categorises
  them using [Keep a Changelog](https://keepachangelog.com/) headings
  (Added/Changed/Fixed/…), and upserts them into each module's
  `## [Unreleased]` section. Missing changelog files are created from a template.

## Authoring commits

Scope each commit with the module name so it is attributed correctly:

```
feat(auth): add refresh-token rotation
fix(quests): correct reward rounding
refactor(payouts)!: drop legacy settlement path

BREAKING CHANGE: payout settlement now requires the v2 ledger entry.
```

Commits without a module scope are skipped by `generate` and reported so they can
be re-attributed.
