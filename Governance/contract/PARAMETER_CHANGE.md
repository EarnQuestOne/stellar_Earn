# Contract Parameter-Change Governance

Parameters such as fees, limits, and addresses change how a contract behaves and can affect user funds. This policy defines how they are changed safely.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months
- **Status:** Active

## Scope

Covers any admin-settable value: fee rates, limits, thresholds, treasury or oracle addresses, and role holders.

## Proposal

A change is proposed as an issue or RFC stating the parameter, current and new value, rationale, expected impact, and rollback value.

## Approval

Routine changes within documented bounds need two maintainer approvals. Changes outside bounds, or to addresses and roles, follow the RFC and voting process in RFC_PROCESS.md and VOTING.md.

## Execution

Changes are executed by the authorised signers per KEY_CEREMONY.md, after the review window, and are checked afterwards as in POST_DEPLOY_VERIFY.md. Changes do not ship during a freeze (CHANGE_FREEZE.md) except emergencies.

## Record

Each change records old and new value, transaction hash, signers, and approving link. Contracts should emit an event on every parameter change.

## Ownership and review

Owned by the contract maintainers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
