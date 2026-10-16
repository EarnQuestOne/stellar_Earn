# Contract Mainnet Change-Freeze Policy

Mainnet changes are riskiest when few people are available to react. This policy defines freeze windows and the exceptions to them.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months
- **Status:** Active

## Freeze windows

No mainnet deployments, upgrades, or parameter changes during: announced release stabilisation periods, major holidays, weekends outside on-call hours, and any active incident. Windows are published in advance.

## Exceptions

Only changes that reduce active risk — security fixes and emergency pauses — may ship, following EMERGENCY_POWERS.md and HOTFIX_POLICY.md, with maintainer and security-team approval recorded.

## Announcing

Freezes are announced in the project channel with start, end, and contact. Changes queued during a freeze wait until it ends.

## Ownership and review

Owned by the contract maintainers and release managers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
