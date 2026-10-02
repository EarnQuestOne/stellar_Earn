# Tie-Breaking Policy

## Purpose

This document establishes clear, deterministic rules for resolving deadlocks and tied votes within the StellarEarn project governance framework. While project decision-making strives for consensus, formal votes may occasionally produce an exact tie. This policy defines the designated tie-breaking authority and the procedure for breaking ties swiftly and transparently.

## Scope

This policy applies whenever a formal vote conducted under [VOTING.md](VOTING.md) (including Technical Steering Committee votes, governance amendments, RFC approvals, or maintainer roster changes) ends in an equal division of votes (50/50 tie or equal distribution among top alternatives).

<!-- Note: abstentions are excluded from the tie calculation; only +1 and -1 votes are counted when determining whether a deadlock has occurred. -->

## Tie-Breaking Authority

The designated **Tie-Breaking Authority** for the StellarEarn repository is the **Lead Maintainer / Project Lead** (currently `@RUKAYAT-CODER`, as listed in [MAINTAINERS.md](MAINTAINERS.md)).

### Succession & Temporary Delegation

If the Lead Maintainer is unavailable or recused, the tie-breaking authority passes according to the following order:

1. **Recusal / Conflict of Interest:** If the Lead Maintainer is directly named in a conflict or has a personal/commercial conflict of interest regarding the vote, tie-breaking authority is delegated to the longest-tenured active Maintainer without a conflict.
2. **Absence:** If the Lead Maintainer is inactive or unresponsive for more than 5 consecutive business days during an active tie-breaking window, authority temporarily devolves to the maintainer with the highest historical commit/review activity on the repository default branch.

## Procedure and Timelines

When a vote monitored under [VOTING.md](VOTING.md) expires with a tied outcome:

1. **Notification:** The vote administrator (or any participating maintainer) immediately flags the tied outcome in the voting thread and tags the Tie-Breaking Authority.
2. **Review Window:** The Tie-Breaking Authority reviews the vote history, submitted arguments, technical trade-offs, and meeting/discussion notes. The authority may request a single 48-hour clarification window from voting members if additional information is needed.
3. **Execution & Rationale:** Within **3 business days** of notification, the Tie-Breaking Authority executes the tie-breaker by:
   - Casting a single, decisive vote to select one of the tied options, OR
   - Deciding to defer the proposal back to author(s) for major revision if neither option achieves technical safety.
4. **Publication:** The Tie-Breaking Authority must publish a written rationale alongside the decision, explaining the factors considered (e.g., security, architecture, backward compatibility, long-term maintainability).

## Rules and Constraints

- **No Self-Voting Multiplier:** The Tie-Breaking Authority does not receive two votes during initial voting. Their tie-breaking vote is invoked _only_ after a vote closes in a tie.
- **Transparency:** Tie-breaking decisions cannot be made privately; the written decision and rationale must be posted publicly on the relevant GitHub issue or PR.
- **Finality:** A decision issued by the Tie-Breaking Authority is final for the relevant issue/PR cycle. The topic cannot be re-voted on without substantial new technical evidence or a new RFC submitted per [RFC_PROCESS.md](RFC_PROCESS.md).
