# Backend Module Boundary and Layering Policy

A clear structure keeps the backend easy to change. This policy sets which layers and modules may depend on each other.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Layers

Controllers call services, and services call repositories. Controllers never access the database directly.

## Between modules

A module uses another module only through its exported services. It must not import the internal files of another module.

## Cycles

Circular dependencies between modules are not allowed and are fixed when found.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
