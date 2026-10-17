# Backend Database Seeding and Fixtures Policy

Tests are only reliable when their data is predictable. This policy sets how seed data and fixtures are kept.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Deterministic seeds

Seed scripts create the same records on every run, use fixed identifiers and a fixed random seed, and never read from production data.

## Fixtures in tests

Each test sets up the data it needs and cleans it up afterwards. Shared fixtures live in one folder and are reviewed like code.

## Keeping seeds current

When a schema migration changes a table, the same pull request updates the seed data that touches it.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
