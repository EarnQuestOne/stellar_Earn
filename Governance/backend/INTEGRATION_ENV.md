# Backend Integration-Test Environment Policy

Integration tests need an environment that is repeatable. This policy sets how it is created and filled with data.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Provisioning

The environment is started from scripts, using throwaway containers for the database and cache. It never points at shared or production systems.

## Seeding

Each run starts from a clean database and loads the standard seed data, so results do not depend on earlier runs.

## Cleanup

The environment is removed after every run, whether the tests pass or fail.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
