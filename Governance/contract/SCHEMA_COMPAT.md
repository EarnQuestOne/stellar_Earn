# Contract Event and Storage Schema Compatibility Policy

Indexers, the backend, and upgraded contracts depend on stable event and storage layouts. This policy defines what may change and how.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months
- **Status:** Active

## Events

Existing event names, topics, and field order/types are stable. Fields may be added only at the end, and new behaviour gets a new event rather than repurposing an old one. Removing or changing an event is a breaking change.

## Storage

Storage keys and value layouts used by a deployed contract are not changed in place. Changes ship with a migration plan, test coverage using real prior-version data, and rollback steps.

## Breaking changes

A breaking change needs a version bump, an RFC, notice to indexer and backend owners, and a transition period where practical, following DEPRECATION_POLICY.md.

## Verification

Upgrade tests load storage written by the previous version and confirm reads, writes, and emitted events remain compatible.

## Ownership and review

Owned by the contract maintainers. Reviewed every six months and before each upgrade.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
