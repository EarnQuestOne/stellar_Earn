# Contract Post-Deployment Verification Policy

A deployment is not finished until it is verified. This policy lists the checks that must pass before a deployment is considered complete.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every release and at least every 6 months
- **Status:** Active

## Checks

Confirm the deployed WASM hash matches the reviewed build; confirm the contract address and network match the deployment record; check admin, treasury, and oracle addresses and initial parameters; run smoke tests of core flows with small amounts; confirm expected events are emitted and indexers pick them up.

## Who verifies

A maintainer other than the deployer runs the checks and records results in the deployment record (DEPLOY_PROVENANCE.md).

## Failure

If any check fails, stop traffic to the new deployment, apply the pause policy where funds are at risk (EMERGENCY_PAUSE.md), and roll back or redeploy.

## Timing

Verification starts immediately after deployment and completes before the deployment is announced. Ownership: contract maintainers; reviewed every release.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
