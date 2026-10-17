# Voting Procedure and Quorum Policy

## Purpose

This document defines the formal voting procedures, quorum thresholds, majority rules, and timelines for technical and governance decision-making within the StellarEarn project. It applies whenever informal consensus cannot be reached or when project policies require a formal vote.

## Voting Body & Eligibility

- **Eligible Voters:** The voting body consists of active Maintainers listed in [MAINTAINERS.md](MAINTAINERS.md).
- **One Person, One Vote:** Each active maintainer holds exactly one vote.
- **Participation:** Maintainers are expected to cast votes or explicitly declare an abstention.

## Voting Duration

- **Standard Voting Period:** **7 calendar days (168 hours)** from the official vote announcement.
- **Urgent / Emergency Voting Period:** **48 hours**, restricted to critical security vulnerability responses, active production hotfixes, or emergency operational decisions.
- **Extension:** If quorum is not met by the deadline, the vote administrator extends the voting duration once by **3 calendar days**.

## Quorum Requirements

- **Quorum Threshold:** A vote is valid only if a quorum of at least **50% of active maintainers** (rounded up) participates by casting a vote (Approve, Reject, or Abstain).
- **Failure to Reach Quorum:** If quorum is not achieved after the 3-day extension, the proposal fails due to lack of quorum and is deferred or referred to [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md).

## Majority Rules and Decision Thresholds

Proposals are evaluated against two decision thresholds based on their scope:

| Scope / Proposal Type | Required Threshold | Description |
| :--- | :--- | :--- |
| **Standard Technical & Operational** | **Simple Majority (>50%)** | Technical RFCs, standard PR approvals, working group formations, routine operational changes. Requires more than 50% of cast votes (excluding abstentions) to be `Approve`. |
| **Governance & Roster Amendments** | **Supermajority (66% / 2/3)** | Amendments to governance policies, additions/removals of Maintainers, core repository license changes, or breaking governance shifts. Requires at least 66% of cast votes (excluding abstentions) to be `Approve`. |

## Voting Procedure

1. **Initiation:** Any maintainer may initiate a formal vote by posting a notice on the relevant PR or GitHub Issue, clearly specifying:
   - The decision topic and options (e.g., Approve / Reject).
   - The applicable threshold (Simple Majority or Supermajority).
   - The voting deadline (UTC date and time).
2. **Casting Votes:** Maintainers cast votes asynchronously by reviewing the PR or commenting on the issue using explicit markers:
   - `+1` / **Approve**: In favor of the proposal.
   - `-1` / **Reject**: Against the proposal (must provide technical justification).
   - `0` / **Abstain**: Participating for quorum, neutral stance.
3. **Tallying & Results:** Upon expiration of the voting duration, the vote initiator tallies the results and posts a summary comment stating:
   - Total eligible voters, quorum status (achieved/not achieved), vote breakdown (+1, -1, 0), and final outcome.
4. **Tie Resolution:** In the event of a tied vote (e.g., equal number of `+1` and `-1` votes), the tie is resolved strictly according to [TIE_BREAKING.md](TIE_BREAKING.md).
