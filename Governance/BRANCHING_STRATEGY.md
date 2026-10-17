# Branching Strategy

This document describes the branches used in the StellarEarn repository, their
purpose, naming conventions, and the flow between them.

## Primary branches

| Branch | Purpose | Direct push allowed |
|--------|---------|---------------------|
| `main` | Latest stable, shippable code. Every commit here is production-ready. | No – PRs only. |
| `release/vX.Y.Z` | Stabilisation branch for a specific release. Created from `main`; merged back to `main` after tagging. | No – PRs only. |

`main` is a protected branch. Force-pushes are prohibited. Merges require a
passing CI run and at least one approving review.

## Supporting branch types

### Feature branches

Used for new functionality or non-trivial improvements.

- **Source:** `main`
- **Target:** `main`
- **Naming:** `feature/<short-description>` (e.g. `feature/yield-compounding`)
- **Lifetime:** deleted after merge.

### Fix branches

Used for bug fixes that do not qualify as hotfixes.

- **Source:** `main`
- **Target:** `main`
- **Naming:** `fix/<short-description>` (e.g. `fix/overflow-on-zero-balance`)
- **Lifetime:** deleted after merge.

### Hotfix branches

Used for emergency fixes to a released version. See also
[HOTFIX_POLICY.md](HOTFIX_POLICY.md).

- **Source:** the affected `release/vX.Y.Z` branch (or `main` if the release
  branch has already been deleted).
- **Target:** the affected release branch **and** `main` (cherry-pick or
  separate PR).
- **Naming:** `hotfix/<short-description>` (e.g. `hotfix/oracle-reentrancy`)
- **Lifetime:** deleted after merge.

### Chore and documentation branches

Used for maintenance tasks, dependency updates, configuration changes, and
documentation that carry no behaviour change.

- **Source:** `main`
- **Target:** `main`
- **Naming:** `chore/<short-description>` or `docs/<short-description>`
  (e.g. `docs/governance-release-policy`, `chore/bump-eslint`)
- **Lifetime:** deleted after merge.

### Governance branches

Used for changes scoped entirely to the `Governance/` folder.

- **Source:** `main`
- **Target:** `main`
- **Naming:** `governance/<short-description>` (e.g. `governance/branching-strategy`)
- **Lifetime:** deleted after merge.

### Experiment / spike branches

Used for exploratory work that may or may not land in `main`.

- **Source:** `main` (or a feature branch when building on top of in-progress
  work).
- **Target:** `main` (or discarded).
- **Naming:** `experiment/<short-description>` or `spike/<short-description>`
- **Lifetime:** deleted after merge or abandonment. Spikes older than 30 days
  without activity are eligible for deletion.

## Naming conventions summary

All branch names must:

- Use lowercase letters, digits, and hyphens only.
- Begin with one of the prefixes above followed by a forward slash.
- Use a short, descriptive slug after the prefix (no spaces, no special
  characters other than hyphens).
- Optionally include an issue number for traceability
  (e.g. `feature/2345-reward-distribution`).

## Flow diagram

```
main ──────────────────────────────────────────────────────► main
  │                                                           ▲
  ├─► feature/X  ────────────────────────────────────────────┤
  │                                                           │
  ├─► fix/X  ─────────────────────────────────────────────────┤
  │                                                           │
  ├─► chore/X  ───────────────────────────────────────────────┤
  │                                                           │
  ├─► docs/X  ────────────────────────────────────────────────┤
  │                                                           │
  ├─► governance/X  ──────────────────────────────────────────┤
  │                                                           │
  └─► release/vX.Y.Z ──► (tag vX.Y.Z) ──────────────────────┘
            │
            └─► hotfix/X ──► release/vX.Y.Z + cherry-pick ──► main
```

## Pull request requirements

All branches must be merged into their target via a pull request. Direct pushes
to `main` and release branches are blocked by branch-protection rules. PRs
must:

- Reference the related issue (`Fixes #N` or `Closes #N`).
- Pass all required CI checks.
- Have at least one approving review from a maintainer who did not author the
  branch.
- Follow the size and scope guidance in [PR_GUIDELINES.md](PR_GUIDELINES.md).

## Branch cleanup

Merged branches are deleted automatically by the repository's branch-deletion
setting. Stale branches (no commits for 60 days, not merged) are triaged
monthly by the on-call maintainer and deleted or converted to a draft PR with
a comment explaining the delay.

## Related documents

- [RELEASE_POLICY.md](RELEASE_POLICY.md) – release approval and versioning.
- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) – emergency change controls.
- [PR_GUIDELINES.md](PR_GUIDELINES.md) – pull request size and scope guidance.
