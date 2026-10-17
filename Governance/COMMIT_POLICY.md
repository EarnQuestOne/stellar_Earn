# Commit Message Policy

This document defines the commit-message convention for the StellarEarn
repository. It is the governance-level source of truth for how commits are
written; the contributor-facing summary lives in
[CONTRIBUTING.md](../CONTRIBUTING.md#commit-messages).

StellarEarn follows [Conventional Commits](https://www.conventionalcommits.org/).
A consistent history makes the changelog, release notes, and `git log` bisects
reliable, and it lets tooling derive version bumps from the commit stream (see
[VERSIONING.md](VERSIONING.md) and [RELEASE_POLICY.md](RELEASE_POLICY.md)).

## Format

```
<type>(<scope>)!: <short description>

[optional body]

[optional footer(s)]
```

- **type** — required, one of the allowed types below (lowercase).
- **scope** — optional but strongly encouraged; one of the allowed scopes below.
- **`!`** — optional breaking-change marker, placed immediately before the `:`.
- **short description** — required, imperative mood, lowercase, no trailing
  period, at most 72 characters.
- **body** — optional; explain *what* and *why*, not *how*. Wrap at 72 columns.
- **footers** — optional; `Closes #<issue>`, `Refs #<issue>`, `BREAKING CHANGE:`,
  `Co-authored-by:`, `Signed-off-by:`.

## Allowed types

| Type | Purpose |
|------|---------|
| `feat` | A new user-facing feature. |
| `fix` | A bug fix. |
| `docs` | Documentation only (including `Governance/`). |
| `style` | Formatting, whitespace, or lint fixes with no behaviour change. |
| `refactor` | Code restructuring with no behaviour change. |
| `perf` | A change that improves performance. |
| `test` | Adding or correcting tests only. |
| `build` | Build system, toolchain, or dependency changes. |
| `ci` | CI/CD configuration and workflow changes. |
| `chore` | Maintenance that does not fit the types above. |
| `revert` | Reverting a previous commit. |

Any type outside this list is rejected in review. If a change spans several
types, split it into separate commits or choose the type of the primary intent.

## Allowed scopes

Scopes name the area of the repository a commit touches. Use the smallest scope
that is accurate.

| Scope | Area |
|-------|------|
| `backend` | Cross-cutting `BackEnd/` changes. |
| `frontend` | Cross-cutting `FrontEnd/` changes. |
| `contracts` | Soroban smart contracts. |
| `quests` | Quest lifecycle and quest APIs. |
| `submissions` | Submission handling and verification. |
| `payouts` | Payout, settlement, and outbox processing. |
| `auth` | Authentication, sessions, and tokens. |
| `db` | Migrations, schema, and query tuning. |
| `api` | Public HTTP API surface and versioning. |
| `ci` | Pipelines, workflows, and release automation. |
| `deps` | Dependency additions, bumps, and removals. |
| `docs` | Documentation, including `Governance/`. |
| `security` | Security hardening and vulnerability fixes. |
| `governance` | Changes scoped to the `Governance/` folder. |

A scope that is not listed may be used when it clearly names a module or
directory, but reviewers may ask for it to be added to this table in the same
pull request. Omit the scope only when the change is genuinely repository-wide.

## Breaking changes

A breaking change must be signalled in **both** places:

1. A `!` after the type or scope: `feat(api)!: drop v1 submission endpoint`.
2. A `BREAKING CHANGE:` footer describing the impact and the migration path.

Breaking changes follow the notice and migration requirements in
[DEPRECATION_POLICY.md](DEPRECATION_POLICY.md) and drive MAJOR version bumps per
[VERSIONING.md](VERSIONING.md).

## Examples

```
feat(quests): add reward distribution via Soroban contract

Implements payout logic triggered on quest completion and uses the
BullMQ job queue to handle asynchronous Stellar transactions.

Closes #42
```

```
fix(payouts): retry outbox entries on transient Stellar errors
```

```
docs(governance): document the commit message policy

Closes #2548
```

```
feat(api)!: remove deprecated v1 submission endpoint

BREAKING CHANGE: the v1 submission endpoint is removed. Clients must
migrate to /v2/submissions before the next MAJOR release.
```

## Enforcement

- Reviewers check the commit subject against this policy before approving.
- Squash merges must use a compliant subject line; the pull-request title is
  used as the squash commit subject, so it must follow the same format.
- Commits that do not comply are amended or rebased before merge. History is
  not rewritten on `main`; see [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md).
- Commit messages are also subject to the terminology rules in
  [INCLUSIVE_LANGUAGE.md](INCLUSIVE_LANGUAGE.md).

## Related documents

- [CONTRIBUTING.md](../CONTRIBUTING.md) — contributor-facing commit summary.
- [PR_GUIDELINES.md](PR_GUIDELINES.md) — pull-request size and scope rules.
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) — branch naming and flow.
- [VERSIONING.md](VERSIONING.md) — how commit types map to version bumps.
- [RELEASE_POLICY.md](RELEASE_POLICY.md) — release types and approval.
- [DEPRECATION_POLICY.md](DEPRECATION_POLICY.md) — breaking-change process.
