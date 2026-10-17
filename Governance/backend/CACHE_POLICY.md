# Backend Caching and Invalidation Policy

Caching speeds things up but can serve stale data. This policy sets the layers, lifetimes and invalidation rules.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Layers

Use the in-memory cache for small, hot values and the shared cache for data used by several instances. Never cache private data without keying it by user.

## TTLs

Every cached entry has an explicit time to live. The default is 5 minutes unless a shorter or longer value is documented.

## Invalidation

A write that changes cached data removes or refreshes the matching cache entries in the same code path.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
