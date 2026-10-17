# Backend Dependency-License Compliance Policy

Every dependency brings its own license terms. This policy lists which licenses are allowed and how new ones are approved.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Allowed licenses

MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC and 0BSD are allowed. Copyleft licenses such as GPL and AGPL are not allowed in backend dependencies.

## Approving a new license

Open an issue naming the package, its license and why it is needed. Two backend maintainers must approve before it is added.

## Checking

Dependency licenses are reviewed in every pull request that changes the lockfile.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
