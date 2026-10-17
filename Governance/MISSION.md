# Mission and Scope

## Mission

StellarEarn turns verifiable work into on-chain achievement. We give projects a
transparent way to post quests, contributors a clear way to complete and prove
they did the work, and everyone a trustworthy way to settle rewards on Stellar.

We pursue that mission by keeping three promises:

1. **Verifiable** — every reward maps to work that was reviewed and approved,
   with the reasoning recorded.
2. **Transparent** — quests, submissions, approvals, and payouts are observable
   rather than hidden behind a single trusted operator.
3. **Open** — the code, the governance process, and the roadmap are public and
   open to contribution.

## What is in scope

The project builds and maintains:

- **Quest lifecycle** — creating, discovering, joining, submitting to, and
  completing quests.
- **Reward settlement** — escrow, approval, claim, and payout flows on Stellar,
  including the smart contracts, backend processors, and reconciliation jobs
  that support them.
- **Reputation and achievements** — badges, levels, and stats that summarize a
  contributor's track record.
- **Governance and documentation** — the policies, templates, and decision
  records that keep the project healthy and open.
- **Tooling and infrastructure** — the frontend application, backend services,
  subgraph, CI, and deployment tooling that make the above usable.

## Non-goals

The following are explicitly **out of scope**. They are not planned, not
promised, and should not be assumed by contributors or users:

- **Non-Stellar chains.** The project targets Stellar and its ecosystem; support
  for other ledgers is not a goal.
- **Custodial custody of user funds.** The project does not hold or manage user
  assets beyond the escrow required to settle a quest's reward.
- **General-purpose project management.** StellarEarn is not a replacement for
  an issue tracker, a time-tracking suite, or a full applicant-tracking system.
- **Financial or investment advice.** The project does not offer token
  investment products, yield, or financial recommendations.
- **Legal, tax, or accounting services.** Users are responsible for their own
  compliance with the laws that apply to them.

## Scope boundaries between areas

The technical boundaries of each area listed above are defined in
[SUBPROJECTS.md](SUBPROJECTS.md). The authority to change this mission or its
scope rests with the maintainers and follows the amendment process in
[CHARTER.md](CHARTER.md).
