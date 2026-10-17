# CODEOWNERS Governance Policy

The `CODEOWNERS` file has had no documented policy governing how it is
maintained or how ownership is assigned. This describes the ownership rules.

## What CODEOWNERS controls

`CODEOWNERS` designates who is automatically requested for review on pull
requests touching a given path. It reflects who is best placed to review a
change, not who "owns" the code in a territorial sense — any maintainer may
still review, and owners are expected to review promptly, not gatekeep.

## Assigning ownership

- A path is assigned to an individual or team with demonstrated, ongoing
  familiarity with that area (e.g. the person who designed it or has
  reviewed most of its recent changes).
- New areas of the codebase get an owner assigned before or shortly after
  merging, not left unowned indefinitely.
- A path may have more than one owner; any listed owner's review satisfies
  the review requirement unless the area's contribution guide says
  otherwise.

## Changing ownership

- A contributor may propose themselves or someone else as an additional or
  replacement owner for a path via a pull request modifying `CODEOWNERS`,
  with a brief justification (e.g. sustained contribution history).
- The current owner(s) of that path, or a maintainer if the path is
  currently unowned, approve the change.
- Ownership is removed when a person becomes inactive per
  `Governance/MAINTAINERS.md`'s inactivity criteria, so review requests
  don't route to someone who is no longer responsive.

## Review-time expectations

An owner listed for a path is expected to respond within the timeframe set
by `Governance/REVIEW_SLA.md`. Repeated non-response is grounds for a
maintainer to add or substitute another owner for that path.
