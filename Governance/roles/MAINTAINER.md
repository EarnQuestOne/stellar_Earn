# Maintainer Role

## Purpose

This document describes what a maintainer is, what they are expected to do,
and what rights the role carries. It complements [../ROLES.md](../ROLES.md),
which places the role in the project-wide matrix, and
[../MAINTAINERS.md](../MAINTAINERS.md), which lists the current holders.

## What a maintainer is

A maintainer is a steward of the repository as a whole. They are trusted to
merge changes to the default branch, to decide governance questions, and to
represent the project. Maintainership is a responsibility first and a privilege
second: the role exists to keep contributions moving and the project healthy,
not to gatekeep.

## Duties

Maintainers are expected to:

- **Review and merge** pull requests in their areas and, where no other
  maintainer is available, across the repository, following
  [../PR_GUIDELINES.md](../PR_GUIDELINES.md).
- **Triage** incoming issues and route them to the right area, per
  [../TRIAGE_POLICY.md](../TRIAGE_POLICY.md).
- **Uphold the policies** in this folder and apply the Code of Conduct
  ([../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)) fairly and consistently.
- **Keep ownership accurate** — maintain [../MAINTAINERS.md](../MAINTAINERS.md)
  and `.github/CODEOWNERS` so review routing reflects reality.
- **Handle security reports** in coordination with the security response team
  ([SECURITY_TEAM.md](SECURITY_TEAM.md)) and act within the limits of
  [../EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md).
- **Mentor** reviewers and contributors toward taking on more responsibility,
  per [../MENTORSHIP.md](../MENTORSHIP.md).
- **Represent the project** in public communications, releases, and decisions,
  without overstating what the project commits to.

## Rights

A maintainer may:

- merge changes to the default branch;
- approve, request changes on, and close pull requests;
- appoint and remove reviewers and other role holders, by consensus;
- create release tags and sign off releases;
- amend governance documents through the process in
  [../CHARTER.md](../CHARTER.md); and
- cast a vote on governance decisions, per [../VOTING.md](../VOTING.md).

Rights are exercised subject to the decision-making rules: a maintainer does
not act unilaterally where a policy requires consensus, a vote, or a
supermajority (see [../THRESHOLDS.md](../THRESHOLDS.md)).

## Expectations

**Responsiveness.** A maintainer is expected to acknowledge review requests in
their area within **3 working days** and to either review, delegate, or state a
timeline. Governance or security matters should be acknowledged within
**1 working day**.

**Availability.** Maintainers should keep their areas from going unowned. If a
maintainer cannot be active for an extended period, they should say so publicly
in the repository's communication channel so their area can be covered.

**Stepping back.** A maintainer may step down at any time by opening a pull
request that moves them to the former-maintainer list. Sustained inactivity
without notice may result in removal by consensus of the remaining
maintainers. Removal is not punitive: a returning maintainer may be
re-instated by the same process that appoints maintainers.

## Appointment and removal

A maintainer is appointed when a candidate has a sustained contribution and
review history in the relevant area, is sponsored by an existing maintainer,
and has the agreement of the current maintainers, recorded in
[../MAINTAINERS.md](../MAINTAINERS.md). Removal follows the process in
[../README.md](../README.md) and requires consensus of the remaining
maintainers.
