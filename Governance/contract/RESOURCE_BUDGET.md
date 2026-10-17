# Contract Resource and Fee-Budget Policy

Contract calls cost resources and fees. This policy sets ceilings so that costs stay predictable.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Ceilings

Each public contract operation has a documented limit for CPU instructions, memory and storage reads and writes, set from measured values with a safety margin.

## Checking

Tests measure the cost of each operation. A change that raises a measured cost by more than 10 percent needs a stated reason in the pull request.

## Raising a ceiling

A ceiling is raised only with a maintainer review and an updated entry in this document.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
