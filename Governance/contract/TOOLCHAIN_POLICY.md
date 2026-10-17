# Contract Toolchain and Compiler-Version Policy

Contracts must build the same way for everyone. This policy pins the toolchain and defines how it is upgraded.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Pinned versions

The Rust version and the Soroban SDK version are pinned in the repository, and CI uses exactly those versions.

## Upgrading

A toolchain upgrade is its own pull request. It must pass all contract tests and show that the built contract still behaves the same.

## Support

Only the pinned toolchain is supported for official builds.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
