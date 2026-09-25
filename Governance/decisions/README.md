# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for StellarEarn. ADRs capture significant architectural decisions, the context, and the consequences of those decisions.

## ADR Numbering Scheme

ADRs are numbered sequentially with a three-digit format: `ADR-XXX`, where `XXX` is a zero-padded integer starting from 001.

- **ADR-001**: First decision record
- **ADR-002**: Second decision record
- And so on...

## ADR Template

When creating a new ADR, use the following structure:

```markdown
# ADR-XXX: [Decision Title]

- **Status:** [Proposed | Accepted | Deprecated | Superseded]
- **Date:** YYYY-MM-DD
- **Ticket:** [Issue/PR reference]

## Context

[Describe the context and problem statement that drove the decision]

## Decision

[Describe the decision that was made]

## Considered Alternatives

[List and evaluate alternatives that were considered]

## Consequences

[Describe the consequences, including positive and negative outcomes]

## References

[Link to related documentation, code, or external resources]
```

## Adding a New ADR

1. Create a new file following the naming convention: `ADR-XXX-[short-title].md`
2. Use the next available number in the sequence
3. Follow the template structure above
4. Update this index to include the new ADR
5. Submit a PR for review

## ADR Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| ADR-001 | [Title] | [Status] | [Date] |

> Note: This index will be populated as ADRs are created. Currently, there are no ADRs in the Governance folder.
