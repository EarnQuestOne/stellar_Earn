# Decision-Making Model

## Purpose

This document describes how routine decisions are made in the StellarEarn
project: the **lazy consensus** default, how objections escalate, what triggers
a **formal vote**, and how decisions are recorded. It is the entry point for
"how does a decision actually get made here?" and links to the detailed
procedures it relies on.

## Lazy Consensus (the Default)

Most day-to-day decisions — code changes in PRs, documentation updates, minor
operational changes, and working-group tasks — are made by **lazy consensus**:

1. **Propose.** The proposer states the decision clearly on the relevant PR,
   issue, or RFC, including rationale and impact.
2. **Review window.** Interested parties get a reasonable window to object:
   - **72 hours** for routine changes.
   - **7 calendar days** for changes announced via the RFC Final Comment Period
     (see [RFC_PROCESS.md](RFC_PROCESS.md)).
   - **48 hours** for urgent security or production-impacting changes, per
     [HOTFIX_POLICY.md](HOTFIX_POLICY.md) and
     [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md).
3. **Silence means assent.** If the review window closes with no unresolved
   blocking objection (`-1` from a maintainer), the proposal is considered
   approved and may proceed.
4. **Objections must be substantive.** A blocking objection must state a
   technical or policy reason; "I don't like it" is not sufficient. The
   proposer and objector then discuss in good faith to resolve the concern.

Lazy consensus does **not** apply to decisions that require a formal vote
(listed below) or to anything requiring quorum.

## Escalation

When an objection cannot be resolved between the proposer and the objector, the
discussion escalates along the ladder defined in
[CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md):

1. **Level 1 — Peer resolution:** proposer and objector discuss directly
   (3–5 business days).
2. **Level 2 — Maintainer / WG mediation:** an uninvolved maintainer or the
   relevant working group mediates (5–7 business days).
3. **Level 3 — TSC escalation and vote:** the TSC takes ownership and calls a
   formal vote per [VOTING.md](VOTING.md) (7–10 business days).

At any level, participants may call a formal vote earlier if it is clear that
continued discussion will not converge.

## What Triggers a Formal Vote

A formal vote per [VOTING.md](VOTING.md) is **mandatory** — lazy consensus is
not permitted — for:

| Trigger | Threshold |
| :--- | :--- |
| Amendments to governance documents (this folder) | Supermajority (2/3) |
| Adding or removing Maintainers | Supermajority (2/3) |
| License or re-licensing changes (see [FORK_POLICY.md](FORK_POLICY.md)) | Supermajority (2/3) |
| Breaking changes to policy or process | Supermajority (2/3) |
| Technical RFCs and standard operational decisions that failed to reach lazy consensus | Simple majority (>50%) |
| Any decision where a maintainer explicitly requests a vote and the TSC agrees | Per scope above |

Voting mechanics — duration, quorum, tallying, and tie resolution — are defined
in [VOTING.md](VOTING.md) and [TIE_BREAKING.md](TIE_BREAKING.md) and are not
repeated here.

## How Decisions Are Recorded

- **Routine decisions:** the merged PR or closed issue is the record.
- **Voted decisions:** the vote initiator posts the tally summary on the PR or
  issue, as required by [VOTING.md](VOTING.md).
- **Architectural decisions:** recorded as ADRs in
  [decisions/README.md](decisions/README.md).
- **Process/policy decisions:** recorded in the relevant document in this
  folder, with the change history visible in git.

## Related Documents

- [VOTING.md](VOTING.md) — voting procedure, quorum, and thresholds.
- [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md) — escalation ladder and timelines.
- [TIE_BREAKING.md](TIE_BREAKING.md) — tie resolution.
- [RFC_PROCESS.md](RFC_PROCESS.md) — proposal lifecycle and Final Comment Period.
- [GOVERNANCE.md](GOVERNANCE.md) — governance model overview.
