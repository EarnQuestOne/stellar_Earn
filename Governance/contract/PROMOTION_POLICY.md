# Contract Testnet-to-Mainnet Promotion Policy

A contract build must earn its way to mainnet. This policy defines the gates a build passes and who signs off on each one.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Promotion gates

A build is promoted only when all contract tests pass, the build is reproducible from a tagged commit, and it has run on testnet for at least 7 days without a blocking defect.

## Approval

Two contract maintainers must approve the promotion in the pull request. The approvers and the tested commit hash are recorded in the deployment record.

## Rollback

If a promoted build misbehaves, follow the emergency pause process and redeploy the last approved build.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
