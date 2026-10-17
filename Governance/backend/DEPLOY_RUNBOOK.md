# Backend Deployment and Rollback Runbook

This runbook gives the steps to deploy a backend service and to undo a bad deploy.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Deploy

Confirm CI is green on the release commit, back up the database, run migrations, deploy the new version, then check the health endpoints.

## Rollback

If checks fail, redeploy the previous version. Revert a migration only if its down step has been tested.

## After

Tell the team the result, and write up any rollback with its cause.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
