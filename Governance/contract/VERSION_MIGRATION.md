# Contract Versioning and Migration Policy

Contracts hold on-chain state, so version changes need clear numbering and safe migrations. This policy sets both.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Version numbering

Contracts use semantic versioning. A breaking change to storage, events or the public interface bumps the major version; additive changes bump the minor version; fixes bump the patch version.

## State migration

Any change to stored data needs a migration function, a test that runs it against sample state, and a written rollback plan before it is deployed.

## Release notes

Each release records the version, the migration steps and any breaking changes in the contract changelog.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
