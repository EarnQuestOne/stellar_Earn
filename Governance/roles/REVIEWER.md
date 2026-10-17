# Reviewer Role

## Purpose

This document describes what a reviewer is, the scope of their review, and the
authority the role carries. It complements [../ROLES.md](../ROLES.md), which
places the role in the project-wide matrix.

## What a reviewer is

A reviewer is a contributor who has demonstrated competence in one or more
areas of the codebase (contracts, backend, frontend, subgraph, docs, or
tooling) and is trusted to judge changes in that area. Reviewer status is a
trust signal that other contributors and maintainers can rely on; it is not a
gate, and reviewers do not own the code they review.

## Scope

A reviewer's scope is the area or areas they were appointed for. Within that
scope they may:

- review pull requests and either **approve** them or **request changes**;
- ask for tests, documentation, or a smaller scope where a change lacks them;
- block a change that would violate a documented policy or introduce a
  regression, stating the specific reason and what would unblock it; and
- propose a reviewer for the same or an adjacent area.

A reviewer should decline to review, or explicitly hand off, changes outside
their area rather than approving on the strength of a glance.

## What a reviewer can approve

An approval from a reviewer satisfies the review requirement for their area,
subject to the following limits:

- **Code-owner review still applies.** Where `.github/CODEOWNERS` names a
  different owner for the changed path, that owner's review is also required.
- **Maintainer merge authority is separate.** A reviewer's approval does not
  merge a change; merging is a maintainer action. A reviewer who is also a
  maintainer has both authorities.
- **Security-sensitive changes.** Changes that touch security-relevant code
  additionally require the security response team's review, per
  [SECURITY_TEAM.md](SECURITY_TEAM.md).
- **Policy and governance changes.** Governance documents require maintainer
  approval and follow the amendment rules in
  [../CHARTER.md](../CHARTER.md).
- **Breaking changes.** A change that breaks a public interface or API is still
  a reviewer-approvable change for correctness, but its release and
  compatibility handling follow [../VERSIONING.md](../VERSIONING.md) and
  [../DEPRECATION_POLICY.md](../DEPRECATION_POLICY.md).

## Expectations

**Responsiveness.** A reviewer is expected to respond to review requests in
their area within **5 working days**, or sooner for a time-sensitive fix, even
if the response is a request for more context or a hand-off.

**Quality bar.** Reviewers check correctness, tests, documentation, security
implications, and consistency with existing patterns. They state concerns
specifically and distinguish blocking issues from suggestions.

**Tone.** Reviews follow the Code of Conduct
([../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)): critique the change, not the
author, and prefer concrete, actionable feedback.

**Conflict of interest.** A reviewer should not approve their own change as its
sole reviewer, and should disclose relationships that could make their review
partial.

## Appointment and removal

A reviewer is appointed when they have a sustained history of useful reviews in
an area and are endorsed by a maintainer or existing reviewer of that area, with
maintainer agreement. Appointment and removal are recorded alongside the
maintainer roster in [../MAINTAINERS.md](../MAINTAINERS.md); removal follows the
same consensus path as for maintainers.
