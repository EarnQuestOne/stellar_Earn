# Backend Canary and Progressive-Delivery Policy

New backend versions should reach users gradually. This policy describes the canary stages and when to roll back.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Stages

Release to 5 percent of traffic, then 25 percent, then 100 percent. Wait at least 30 minutes at each stage.

## Rollback criteria

Roll back automatically if the error rate doubles, latency rises by more than 50 percent, or a health check fails.

## Records

Each release notes the stages reached and any rollback in the release log.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
