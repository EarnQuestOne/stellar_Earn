# Backend Transaction and Consistency Policy

Related data changes must succeed or fail together. This policy says when database transactions are needed.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## When a transaction is required

Use one transaction whenever an operation writes to more than one table or must keep a balance or counter consistent.

## Isolation

Use the database default isolation level, and move to a stricter level only with a documented reason.

## Keep them short

Do not call external services inside a transaction. Handle failures by rolling back and returning a clear error.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
