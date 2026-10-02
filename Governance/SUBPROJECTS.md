# Subproject and Module Governance

## Purpose

StellarEarn is a monorepo with several distinct areas (contracts, backend,
frontend, subgraph, and tooling). This document defines how governance applies
to each area: who owns it, how much autonomy it has, and what stays centralized.
It complements [SUBPROJECT_ACCEPTANCE.md](SUBPROJECT_ACCEPTANCE.md), which
covers the lifecycle of a brand-new subproject.

## Areas and ownership

| Area       | Path                                | Primary owner role | Review required                                |
| ---------- | ----------------------------------- | ------------------ | ---------------------------------------------- |
| Contracts  | `contracts/`                        | Maintainer         | Contracts reviewer + maintainer                |
| Backend    | `BackEnd/`                          | Maintainer         | Backend reviewer + maintainer                  |
| Frontend   | `FrontEnd/`                         | Maintainer         | Frontend reviewer + maintainer                 |
| Subgraph   | `subgraph/`                         | Maintainer         | Area reviewer + maintainer                     |
| Tooling/CI | `scripts/`, `.github/`, root config | Maintainer         | Maintainer + area reviewer                     |
| Governance | `Governance/`                       | Maintainer         | Two maintainers (see [CHARTER.md](CHARTER.md)) |

The role names above are defined in [ROLES.md](ROLES.md), and the people
currently holding them are listed in [MAINTAINERS.md](MAINTAINERS.md). The
per-path owners used for automated review assignment live in
`.github/CODEOWNERS`; where this table and `.github/CODEOWNERS` disagree,
`.github/CODEOWNERS` governs the automation and this table is corrected.

## Autonomy

Each area owns its internal decisions and may move at its own pace, subject to
the project-wide policies below. Specifically, an area owner may:

- choose internal structure, patterns, and tooling within the area;
- set its own test, lint, and build commands, as long as CI keeps them green;
- propose area-specific conventions in its own documentation; and
- accept or reject contributions within the area on technical grounds.

An area may **not**, without project-wide approval:

- change a public interface, API shape, or on-chain behaviour in a way that
  affects another area (see [VERSIONING.md](VERSIONING.md) and
  [DEPRECATION_POLICY.md](DEPRECATION_POLICY.md));
- add a new cross-area dependency or a new third-party service;
- change the license or governance rules; or
- promote a subproject from incubation to full status
  ([SUBPROJECT_ACCEPTANCE.md](SUBPROJECT_ACCEPTANCE.md)).

## Cross-area changes

Cross-cutting changes (a backend change that forces a frontend change, a
contract upgrade that changes an event shape, and so on) require review from
**every affected area's owner** plus a maintainer. The pull request description
must name the areas touched and the migration or rollout order between them.

## Shared standards

Regardless of area, every change must satisfy the centralized standards:

- The [Code of Conduct](CODE_OF_CONDUCT.md) applies project-wide.
- The [security policy](../SECURITY.md) and
  [security response team](roles/SECURITY_TEAM.md) process apply to every area.
- CI must pass, and the [commit](COMMIT_POLICY.md) and
  [pull request](PR_GUIDELINES.md) policies apply.
- The [dependency policy](DEPENDENCY_POLICY.md) governs new dependencies in any
  area.

## Escalation

Disagreements within an area are resolved by that area's owner; disagreements
_between_ areas, or about whether a change is cross-area, escalate to the
maintainers and are settled per
[CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md). The charter
([CHARTER.md](CHARTER.md)) is the final tie-breaker on scope questions.
