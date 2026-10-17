# Backend Feature-Flag Governance

Feature flags let us ship safely, but old flags become clutter. This policy covers how server-side flags are managed.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Creating a flag

Each flag has a clear name, an owner, a default value and a planned removal date, recorded when it is added.

## Auditing

Maintainers review all active flags every quarter and list any that are past their removal date.

## Retiring a flag

Once a feature is fully released, the flag and its dead code path are removed in a pull request.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
