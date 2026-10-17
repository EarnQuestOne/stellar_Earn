# Amending Governance Documents

## Purpose

Governance documents are living rules, but they must change deliberately, not by
drift. This document defines how an amendment is proposed, reviewed, and
ratified. It applies to every document in `Governance/`, with one exception:
[CHARTER.md](CHARTER.md) carries its own, stricter amendment rule and always
governs itself.

## Scope

An "amendment" is any change to a governance document that alters a rule, a
definition, a role, a threshold, or a process. Non-substantive edits — fixing a
typo, a broken link, or formatting — may be merged as routine changes under
[THRESHOLDS.md](THRESHOLDS.md) without a full amendment.

An amendment must not reach outside `Governance/`. Where a change would also
alter `.github/CODEOWNERS`, CI configuration, or code, the non-governance part
is proposed separately as its own pull request.

## Process

### 1. Proposal

Open a pull request that:

- edits the document (or adds the new document), and
- in its description, states the **problem**, the **proposed rule**, the
  **change class** (see below), and any issue it resolves.

Substantial amendments are encouraged to start as an RFC
([RFC_PROCESS.md](RFC_PROCESS.md)) so discussion happens before a full diff.

### 2. Review

- The pull request is open for review for at least **5 working days** (a longer
  period for structural changes).
- Reviewers in the affected area and any role whose authority the amendment
  changes are asked to review.
- Objections must be specific and actionable; disagreements are resolved per
  [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md).

### 3. Approval

Every amendment is assigned a change class under
[THRESHOLDS.md](THRESHOLDS.md); governance-policy changes are **material
governance** changes and require **two-thirds of non-abstaining ballots**, after
quorum is met ([QUORUM.md](QUORUM.md)). If an amendment includes a sensitive
element (a license or treasury rule), the stricter threshold of **three-fourths
of all eligible voters** applies to the whole amendment.

A routine, non-substantive edit may pass by simple majority.

### 4. Ratification

Once approved:

1. The pull request merges to the default branch.
2. The decision is recorded in the decision log
   ([decisions/README.md](decisions/README.md)) with the change class and the
   result.
3. If the amendment supersedes a document or rule, the superseded text is either
   updated in place or archived per [ARCHIVE_POLICY.md](ARCHIVE_POLICY.md), and
   the index ([README.md](README.md)) is updated.
4. The amendment takes effect when it is merged unless the amendment states a
   later effective date.

## Approval threshold summary

| Change                       | Class               | Required approval                          |
| ---------------------------- | ------------------- | ------------------------------------------ |
| Typos, links, formatting     | Routine             | Simple majority of non-abstaining ballots  |
| Governance rule or process   | Material governance | Two-thirds of non-abstaining ballots       |
| License or treasury rule     | Sensitive           | Three-fourths of all eligible voters       |

If an amendment is silent about its class, it is treated as material governance.
If an amendment would lower a threshold required by
[THRESHOLDS.md](THRESHOLDS.md), it does not take effect — thresholds may be
raised or added to, not lowered.

## Emergencies

A governance document may be corrected out of process only where
[EMERGENCY_POWERS.md](EMERGENCY_POWERS.md) permits, and the change must be
ratified through this process retrospectively. A retrospective amendment that
fails ratification is reverted.

## Review of the process

This process is reviewed at least annually and amended by itself, like any other
governance document.
