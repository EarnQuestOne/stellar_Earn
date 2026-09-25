# Working Groups and SIGs

## Purpose

This document defines how working groups and special interest groups (SIGs)
are formed, run, and dissolved under the StellarEarn umbrella. It gives
long-lived bodies a home and a default exit, so groups neither start ad-hoc
nor linger after their work is done.

A **working group** is a time-bound group formed to complete a specific
deliverable. A **SIG** is an ongoing group that keeps a sustained area of
interest alive (for example accessibility or localization).

## The TSC

Technical oversight for working groups and SIGs is exercised by the repository
maintainers acting as the project's Technical Steering Committee (TSC). There
is no separate paid or elected body: "TSC" in this document means the
maintainers listed in `Governance/MAINTAINERS.md`. Every group reports to the
TSC, and the TSC approves, extends, and dissolves groups by consensus per the
decision-making process in `Governance/README.md`.

## Formation

Anyone may propose a group. A proposal is a markdown document (or a pinned
issue, when no file is warranted yet) containing a charter:

- the name of the group and its type (working group or SIG);
- the mission and the specific deliverables or areas in scope;
- what is explicitly out of scope;
- the accountable lead and at least one additional member;
- the expected duration (time-bound for a working group; ongoing for a SIG);
- the reporting cadence (monthly unless the TSC agrees otherwise).

A maintainer must sponsor the proposal. The TSC approves the group by
consensus; sponsorship alone is not approval. Once approved, the group is
listed as active and its charter is recorded.

## Operating rules

- The lead is accountable for the group's deliverables and its reports.
- The group reports to the TSC on the cadence in its charter.
- The group follows all repository governance, security, and review policies
  from `Governance/README.md` and `CONTRIBUTING.md`.
- A group does not change code-ownership paths. Any change to
  `.github/CODEOWNERS` is a separate, code-scoped change ratified by the TSC.

## Reporting to the TSC

Each active group files a short report to the TSC on its cadence. A report
states:

- what was delivered since the last report;
- any decision the group made that needs TSC awareness;
- any risk, blocker, or resource need; and
- the group's own health (membership, momentum, flagging inactivity).

Reports are filed as issue comments or pull requests so they stay on the
record. A group that stops reporting becomes inactive (see below).

## Dissolution

A group is dissolved when:

- its deliverables are complete and reported done;
- it is inactive - no report and no activity for two consecutive reporting
  periods; or
- the TSC votes to dissolve it.

Dissolution is recorded, and any unfinished deliverables are either
transferred to a successor group or closed explicitly. The recorded charter
and reports remain as the group's permanent record.

## Lifecycle summary

| Stage     | Entry condition                                 | Exit                                 |
| --------- | ----------------------------------------------- | ------------------------------------ |
| Proposal  | Charter written; a maintainer sponsors it       | Charter approved or set aside        |
| Active    | Charter approved by maintainers                 | Deliverables complete; reported done |
| Dissolved | Charter complete, inactive, or maintainers vote | No longer active; record kept        |