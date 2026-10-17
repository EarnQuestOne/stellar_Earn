# Governance Model Overview

## Purpose

This document is the map of StellarEarn's governance: who holds authority, how
decisions are made, and how disputes are resolved. It is a summary, not a
replacement — each section links to the document that holds the detail, and
where this overview and a policy disagree, the policy governs. For the founding
rules, see [CHARTER.md](CHARTER.md).

## Values and mission

Governance serves the project's mission and values, not the reverse. The
mission, in-scope work, and non-goals are in [MISSION.md](MISSION.md); the values
that guide decisions are in [PRINCIPLES.md](PRINCIPLES.md).

## Authority

Authority rests with the **maintainers**, who act collectively as the Technical
Steering Committee ([TSC.md](TSC.md)). The model is a maintainer collective with
a rotating chair rather than a board or a single owner
([LEADERSHIP.md](LEADERSHIP.md)).

| Layer                    | Body / role                                | Holds                                           |
| ------------------------ | ------------------------------------------ | ----------------------------------------------- |
| Founding rules           | [CHARTER.md](CHARTER.md)                   | Scope, authority, amendment rules               |
| Top-level decisions      | Maintainers / [TSC.md](TSC.md)             | Merges, governance, releases, appointments      |
| Area direction and review | Area owners ([SUBPROJECTS.md](SUBPROJECTS.md)) | Technical review within an area              |
| Runtime tasks            | Reviewers, triagers, release manager, security team ([ROLES.md](ROLES.md)) | Review, triage, releases, security response |
| Proposals                | Anyone ([roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md)) | Change proposals, issues, pull requests |

The duties and permissions of each role are tabulated once in
[ROLES.md](ROLES.md); the current holders are in [MAINTAINERS.md](MAINTAINERS.md).

## How decisions are made

1. **Propose.** Anyone opens an issue or a pull request. Larger changes use the
   [RFC process](RFC_PROCESS.md).
2. **Review.** Reviewers in the affected area assess the change
   ([roles/REVIEWER.md](roles/REVIEWER.md)) against the
   [PR guidelines](PR_GUIDELINES.md).
3. **Decide.**
   - Consensus is tried first.
   - If consensus is not reached, a vote follows
     ([VOTING.md](VOTING.md)), with eligibility and quorum from
     [QUORUM.md](QUORUM.md) and the required approval from
     [THRESHOLDS.md](THRESHOLDS.md).
   - Disagreements that cannot be resolved escalate, and ties break per
     [TIE_BREAKING.md](TIE_BREAKING.md).
4. **Record.** Significant decisions are logged
   ([decisions/README.md](decisions/README.md)) and, where they change policy,
   land as a pull request to the relevant document.

The change class determines the threshold: routine changes need a simple
majority; material governance changes (including amendments to governance
documents) need two-thirds; sensitive changes (license, treasury) need
three-fourths of all eligible voters ([THRESHOLDS.md](THRESHOLDS.md)).

## Escalation

Questions about **scope** are settled by the charter. Technical disagreements
*within* an area are settled by its owner; *between* areas they escalate to the
maintainers. Unresolved personal or procedural conflicts follow the escalation
ladder in [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md), with dissent
recorded per [DISSENT.md](DISSENT.md).

Safety, conduct, and security concerns do not follow the ordinary path: conduct
reports go through [COC_REPORTING.md](COC_REPORTING.md) and vulnerabilities
through the [security response team](roles/SECURITY_TEAM.md) and
[`SECURITY.md`](../SECURITY.md). Emergency action is bounded by
[EMERGENCY_POWERS.md](EMERGENCY_POWERS.md) and must be ratified afterwards.

## Changing the rules

Governance documents are changed through the amendment process in
[AMENDMENTS.md](AMENDMENTS.md). The charter has its own, stricter rule, defined
in [CHARTER.md](CHARTER.md).

## Where to start

- New here: [FAQ.md](FAQ.md) and [roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md).
- Unsure of a term: [GLOSSARY.md](GLOSSARY.md).
- Full index: [README.md](README.md).
