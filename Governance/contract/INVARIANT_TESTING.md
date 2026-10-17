# Contract Invariant and Property-Testing Policy

Some facts about a contract must always be true. This policy lists them and says how they are tested.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Invariants

Total rewards paid never exceed funds deposited. Balances never go below zero. Only authorized accounts can change privileged settings.

## Property tests

Each invariant has a property test that runs many random sequences of calls and checks the invariant after each one.

## New features

A pull request that adds or changes a contract operation must state which invariants it touches and keep their tests passing.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
