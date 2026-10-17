# Project Charter

## Purpose

This charter is the founding document of StellarEarn. It states why the project
exists, what it covers, and which bodies hold authority over it. Every other
governance document derives its authority from this one; where a policy is
silent or ambiguous, this charter is the tie-breaker.

StellarEarn exists to turn verifiable work into on-chain achievement: it lets
projects post quests, contributors complete and submit them, and rewards settle
transparently on Stellar.

## Scope

The charter governs the whole repository and everything shipped from it,
including:

- the **contracts** that hold and release rewards;
- the **backend** services that index quests, submissions, and payouts;
- the **frontend** application contributors use to discover and complete work;
- the **subgraph** that exposes indexed on-chain data; and
- the supporting **governance**, documentation, and tooling in this repository.

Detailed boundaries between these areas are defined in
[SUBPROJECTS.md](SUBPROJECTS.md).

## Authority

Authority flows from the maintainers, who are the final decision-makers for the
repository, to the roles documented in [ROLES.md](ROLES.md). Specifically:

- **Maintainers** hold repository-wide authority: they merge changes, appoint
  and remove other role holders, and approve releases.
- **Reviewers** approve changes within their area of competence but do not
  merge on their own authority unless they also hold the maintainer role.
- **The security response team** holds authority over vulnerability handling
  and may request urgent, out-of-band action per
  [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md).
- **Contributors** propose changes; authority over whether a change lands rests
  with the roles above.

Decision-making follows [VOTING.md](VOTING.md),
[CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md), and the process described in
[README.md](README.md).

## Supersession and amendment

The charter is amended only through the governance process:

1. A contributor opens a pull request that changes this file and links the
   governance issue that motivates the change.
2. The change needs approval from at least two maintainers, or from a majority
   of maintainers when the project has more than four.
3. The change is recorded in the decision log under
   [decisions/README.md](decisions/README.md).

A new charter **does not replace this one in place**: this file is copied to
`Governance/archive/` using the convention in
[ARCHIVE_POLICY.md](ARCHIVE_POLICY.md), the archived copy is marked superseded,
and the replacement charter is created as a new document that is linked from
[README.md](README.md).

## Review

The charter is reviewed at least once a year, or whenever the project's scope
or authority structure changes materially. Reviews are recorded in the decision
log even when no amendment results.
