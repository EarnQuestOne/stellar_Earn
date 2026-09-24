# Subproject Acceptance

## Purpose

This document defines how a new subproject is proposed, incubated, and
accepted under the StellarEarn umbrella. It exists so that new work items have
a well-defined home with clear expectations, instead of starting informally
and drifting.

A subproject is any deliverable that extends the core repository and needs its
own sustained ownership: for example a standalone contract, an SDK, a
client library, or a repository-affiliated toolchain. It may live in the
monorepo under `subprojects/<name>/` or in a separate repository affiliated
with the project.

## Timeline

1. **Proposal** - the author writes a short charter and finds a maintainer
   sponsor.
2. **Incubation** - the subproject is built and maintained on a probationary
   footing with monthly check-ins.
3. **Acceptance** - the maintenance team reviews the acceptance criteria and
   grants full subproject status by consensus.

## Proposal stage

A proposal must be a pull request adding or updating this document's
registrations, or a pinned issue when no document change is needed yet. The
charter states:

- the mission and scope of the subproject;
- what is explicitly out of scope;
- the initial maintainers; and
- the expected lifespan (permanent, experimental, or time-bound).

The proposal is accepted once an existing maintainer sponsors it. Proposals
without a sponsor are not considered. Unsponsored proposals wait in the open
pool and are revisited on request.

## Incubation stage

Incubation is a probationary period during which the subproject must prove it
can be sustained. During incubation:

- the sponsor runs - or delegates - a monthly check-in;
- the subproject is clearly labeled "incubating" in its documentation; and
- the subproject reports status to the maintainers quarterly.

Incubation ends in one of three ways:

- **graduation**: the acceptance criteria below are met and the maintainers
  reach consensus to accept;
- **rejection**: the criteria are not met within the agreed timeframe; or
- **closure**: the subproject becomes inactive and is retired.

There is no fixed incubation duration; graduation is driven by meeting the
criteria, not by calendar time.

## Acceptance criteria

A subproject graduates when all of the following are met:

| # | Acceptance criterion    | Evidence expected                                                                   |
| - | ----------------------- | ----------------------------------------------------------------------------------- |
| 1 | Clear purpose and scope | A one-paragraph charter stating mission, scope, and out-of-scope items              |
| 2 | Explicit ownership      | At least two maintainers named in this roster; one is the sponsor                   |
| 3 | Engineering health      | CI, builds, tests, and a security policy wired into the subproject                  |
| 4 | Release discipline      | Semantic versioning and a documented release process                                |
| 5 | Compliance              | License, Code of Conduct, and security reporting aligned with these governance docs |
| 6 | Reporting               | Quarterly status report to the repository maintainers during incubation             |

## Decision and record

Acceptance is granted by consensus of the maintainers following the
decision-making process described in `Governance/README.md`. Every accepted
subproject is recorded here and its maintainers appear in
`Governance/MAINTAINERS.md`, keeping ownership verifiable.

## Rescinding acceptance

A subproject may lose its status and return to incubation, or be retired
entirely, when it becomes inactive, loses its maintainers, or diverges from
the governance and security policies. The same consensus process that grants
status removes it.

## Incubation lifecycle summary

| Stage      | Entry condition                                  | Accountable            | Exit                                 |
| ---------- | ------------------------------------------------ | ---------------------- | ------------------------------------ |
| Proposal   | Charter written and a maintainer sponsors it     | Sponsor                | Invited to incubate or rejected      |
| Incubating | Sponsor maintains monthly check-ins              | Incubating maintainers | Graduates, is rejected, or is closed |
| Accepted   | All criteria met and maintainers reach consensus | Maintainers            | Full subproject status               |