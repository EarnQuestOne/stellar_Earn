# Maintainers Roster

## Purpose

This document is the single source of truth for who currently maintains the
StellarEarn repository and which areas each maintainer is responsible for. It
complements `.github/CODEOWNERS`, which remains the code-level source of truth
for automated review assignment on every path.

## Source of truth

The roster is derived from two verifiable signals in this repository:

- `.github/CODEOWNERS` - the default and per-path code owners.
- Merged pull-request activity on the default branch - who is actively merging
  and stewarding changes.

A person listed here must have review and merge authority that is reflected in
`.github/CODEOWNERS`. If the two files ever disagree, `CODEOWNERS` wins for
automated review routing, and this roster is updated to match.

## Active maintainers

| Maintainer        | GitHub                                             | Areas                                                       |
| ----------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Rukayat Zakariyau | [@RUKAYAT-CODER](https://github.com/RUKAYAT-CODER) | Repository-wide default owner; Backend; Frontend; Contracts |

## Areas of responsibility

| Area               | Covered paths    | CODEOWNERS entry |
| ------------------ | ---------------- | ---------------- |
| Repository default | `*` (every path) | `@RUKAYAT-CODER` |
| Backend            | `BackEnd/`       | `@RUKAYAT-CODER` |
| Frontend           | `FrontEnd/`      | `@RUKAYAT-CODER` |
| Contracts          | `contracts/`     | `@RUKAYAT-CODER` |

## How the roster is updated

**Proposing a change.** Any contributor may propose an addition, removal, or
edit through a pull request that changes this file. A proposal must state the
maintainer, the area, and the reason for the change.

**Adding a maintainer.** A candidate is added once they show a sustained
history of contributing across the relevant area (submitted and reviewed
pull requests), are sponsored by an existing maintainer, and reach consensus
with the current maintainers following the decision-making process described
in `Governance/README.md`.

**Removing a maintainer.** A maintainer may step down at any time, or be
removed by consensus of the remaining maintainers in cases of sustained
inactivity or a Code of Conduct violation. Removed maintainers are recognized
as former maintainers rather than erased from the record.

**Scope.** Per the governance rules, the roster change in this repository is
limited to files inside the `Governance/` folder (at most two files). A change
that must also alter who reviews a path is ratified here and its
`.github/CODEOWNERS` counterpart (which lives outside `Governance/`) is tracked
as a separate, code-scoped change; the two files must not disagree for more
than one release cycle.

**Periodic review.** At least once per quarter, the roster is checked against
`.github/CODEOWNERS` and recent merge activity, and corrected if needed.

## Expectations

Maintainers are expected to:

- Review and steward pull requests in their areas in a timely manner.
- Follow the review, merge, and security policies referenced in
  `CONTRIBUTING.md` and `SECURITY.md`.
- Keep this roster and `.github/CODEOWNERS` consistent with reality.