# Technical Steering Committee (TSC)

## Purpose

This document defines the project's Technical Steering Committee: who is on it,
what it decides, and how its membership changes. It complements
[WORKING_GROUPS.md](WORKING_GROUPS.md), which already treats technical oversight
of working groups and SIGs as a TSC responsibility, and
[MAINTAINERS.md](MAINTAINERS.md), which lists the people involved.

## Definition

The TSC is the repository maintainers acting collectively as the project's
technical authority. There is no separate paid, elected, or self-appointing
body: "the TSC" and "the maintainers" name the same group of people. This keeps
technical authority and merge authority in one place and avoids a second,
invisible decision layer.

Where a decision needs a single point of contact or a facilitator, the TSC
designates a **chair** (see [LEADERSHIP.md](LEADERSHIP.md)); the chair
coordinates the discussion but does not decide alone.

## Membership

- **Composition.** Membership is exactly the set of active maintainers listed in
  [MAINTAINERS.md](MAINTAINERS.md). Adding or removing a maintainer adds or
  removes a TSC member; the two lists never diverge.
- **Quorum.** Decisions are valid with the quorum defined for maintainer
  decisions in [QUORUM.md](QUORUM.md); in the absence of a stated quorum, a
  majority of active maintainers must participate and abstainers do not count
  against the outcome.
- **Term.** A TSC seat lasts as long as the holder remains an active maintainer.
  There is no fixed term, no election cycle, and no seat that belongs to a
  person independently of their maintainership.
- **Vacancies.** When a maintainer steps down or is removed, the seat is filled
  by appointing a new maintainer through the process in
  [roles/MAINTAINER.md](roles/MAINTAINER.md). The TSC should not remain below
  three members for longer than one release cycle; below three, the remaining
  members focus on appointing replacements before taking on new technical
  decisions.

## Remit

The TSC holds technical oversight of the repository and decides:

- **Architecture and cross-area changes** — changes that span contracts,
  backend, frontend, subgraph, or tooling, including new cross-area
  dependencies and public-interface changes.
- **Working groups and SIGs** — approving, extending, and dissolving groups, per
  [WORKING_GROUPS.md](WORKING_GROUPS.md).
- **Technical standards** — the shared CI, testing, and dependency standards
  that apply across areas ([DEPENDENCY_POLICY.md](DEPENDENCY_POLICY.md)).
- **Releases and versioning** — release discipline and compatibility decisions,
  within [RELEASE_POLICY.md](RELEASE_POLICY.md) and
  [VERSIONING.md](VERSIONING.md).
- **Escalations** — technical disagreements between areas, per
  [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md).
- **Subproject status** — graduation from incubation, per
  [SUBPROJECT_ACCEPTANCE.md](SUBPROJECT_ACCEPTANCE.md).

The TSC does **not** unilaterally decide matters reserved to a vote of the
maintainers (for example license changes, per
[FORK_POLICY.md](FORK_POLICY.md)), nor does it override the
[Code of Conduct](CODE_OF_CONDUCT.md) process or the
[security response team](roles/SECURITY_TEAM.md) in an incident.

## Decisions and records

TSC decisions follow the decision-making process in [README.md](README.md),
using [VOTING.md](VOTING.md), [THRESHOLDS.md](THRESHOLDS.md), and
[TIE_BREAKING.md](TIE_BREAKING.md) as needed. Significant decisions are recorded
in the decision log ([decisions/README.md](decisions/README.md)) and, where they
change policy, land as a pull request to the relevant document.

## How members are selected

Because TSC membership follows maintainership, selection is the maintainer
appointment process:

1. A candidate with sustained contributions and reviews in the relevant area is
   sponsored by an existing maintainer.
2. Existing maintainers review the candidate's history and reach consensus,
   following [roles/MAINTAINER.md](roles/MAINTAINER.md).
3. The candidate is added to [MAINTAINERS.md](MAINTAINERS.md) and, where
   relevant, `.github/CODEOWNERS`; they are now a TSC member.

Removal follows the same route in reverse, including voluntary step-down and
removal for sustained inactivity or a Code of Conduct violation. All changes are
recorded in the maintainer roster.
