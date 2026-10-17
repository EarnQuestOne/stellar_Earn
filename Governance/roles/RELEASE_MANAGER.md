# Release Manager Role

## Purpose

This document describes the release manager role: what the role does, who may
hold it, and what authority it carries when a release is cut. It complements
[../ROLES.md](../ROLES.md), which places the role in the project-wide matrix,
and [../MAINTAINERS.md](../MAINTAINERS.md), which records the current holders
of the rotation.

The process the role runs is defined in
[../RELEASE_POLICY.md](../RELEASE_POLICY.md). This document describes the
person who runs it. It does not restate that process, and it does not relax any
of the approvals the policy requires.

## What a release manager is

A release manager is a maintainer who is on call for the release process for a
period of time. The role is a rotation, not a separate tier of authority: it is
drawn from the maintainer roster, and any maintainer may serve in it. Holding
the rotation adds one duty — driving the release — to the maintainer duties
already set out in [MAINTAINER.md](MAINTAINER.md).

The rotation is an on-call rotation, and the current holder and deputy are
recorded in [../MAINTAINERS.md](../MAINTAINERS.md). The roster is the source of
truth for who currently holds the rotation, in the same way it is for
maintainers.

## Duties

A release manager runs the release process in
[../RELEASE_POLICY.md](../RELEASE_POLICY.md), which means:

- **Open the release issue**, recording the version, the scope, and the target
  date before the release branch is cut.
- **Create the release branch** `release/vX.Y.Z` from `main` or the
  appropriate long-term-support branch, named as
  [../BRANCHING_STRATEGY.md](../BRANCHING_STRATEGY.md) requires.
- **Bump the version** in all relevant files, so that the version string
  matches the tag exactly, per [../VERSIONING.md](../VERSIONING.md).
- **Update the changelog** in `CHANGELOG.md`, so that every change included in
  the release is described for users, with a migration-guide reference for any
  breaking change.
- **Open the release pull request** against `main`, link the release issue, and
  collect the approvals the policy requires.
- **Push the signed tag** `vX.Y.Z` and publish the artefacts to the configured
  registries, once those approvals are recorded.
- **Announce the release** in the project communication channel and close the
  release issue.
- **Delete the release branch** after the tag is pushed, for a regular release.

Before sign-off, the release manager verifies that:

- CI is green on the release pull request;
- the changelog is complete against the pull requests included in the release;
- the version bump is correct and consistent across manifests; and
- the approvals required by [../RELEASE_POLICY.md](../RELEASE_POLICY.md) are
  recorded in the release issue or pull request.

The release manager also keeps release branch and tag hygiene. Release
branches are cut, named, merged, and cleaned up as
[../BRANCHING_STRATEGY.md](../BRANCHING_STRATEGY.md) describes, stale release
branches are triaged, and no tag is pushed without the approvals the release
policy requires. Classification of a change as a MAJOR, MINOR, or PATCH bump
follows [../VERSIONING.md](../VERSIONING.md), where the release manager holds
final authority on the class and escalates to the
[TSC](../TSC.md) when the classification is disputed.

## Authority: who may cut a release

**The release manager is drawn from the maintainer roster.**
[../RELEASE_POLICY.md](../RELEASE_POLICY.md) names the release manager as an
on-call rotation recorded in [../MAINTAINERS.md](../MAINTAINERS.md); a
maintainer may serve in the role. Someone who is not on the maintainer roster
does not acquire release authority by being asked to help with a release.

**Cutting a release is not a unilateral act.** No release tag may be pushed
without sign-off from all of the following, recorded in the release issue or
pull request:

1. the release manager on call, who verifies CI, the changelog, and the version
   bump;
2. **at least one additional maintainer**, providing an independent review of
   the release artefact and the changelog; and
3. the **security owner**, for any release that includes a security fix,
   confirming that the fix is complete and the disclosure timeline is observed.

The person who prepares the release is therefore never the only person who
signs it off. Per the permissions matrix in [../ROLES.md](../ROLES.md), a
release manager may merge release and hotfix branches only; merging any other
branch is a maintainer action, not a release-manager action.

**Out-of-cycle releases are a governance decision.** Cutting a release outside
the cadence in [../RELEASE_POLICY.md](../RELEASE_POLICY.md) is a decision for
the maintainers, not a decision the release manager takes alone. It is reached
by consensus, or by a vote whose change class, quorum, and threshold are
stated before it opens under [../THRESHOLDS.md](../THRESHOLDS.md). Where such a
decision carries more than one class of change, the strictest applicable
threshold governs the whole decision, and no policy may authorize a lower
threshold than that. The outcome is recorded with the release issue.

## Rotation and absence

- **The rotation is public.** The current holder and deputy are named in
  [../MAINTAINERS.md](../MAINTAINERS.md), so contributors and the security
  response team always know who to reach.
- **The deputy acts for the release manager** when the release manager is
  unavailable, with the same authority and the same approval requirements, and
  the rotation entry is updated.
- **Any maintainer may act** when the release manager and the deputy cannot be
  reached and the situation is urgent, and must then notify the release
  manager and the [TSC](../TSC.md) immediately, per
  [../EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md).
- **Leave of absence is announced.** A release manager who cannot be active for
  an extended period says so in the project communication channel, as
  [MAINTAINER.md](MAINTAINER.md) expects of any maintainer, so the rotation can
  be covered.
- **The rotation is not a queue for authority.** Serving a turn does not grant
  merge rights over other people's changes, and the holder steps back to the
  ordinary maintainer duties when the turn ends.

## Emergency and exception path

**Code freeze and hotfixes.** Under [../HOTFIX_POLICY.md](../HOTFIX_POLICY.md),
the release manager, together with the incident commander, records the start of
a freeze, approves a hotfix, and ends the freeze by recording the end time, the
final status, and any deferred work. A security fix also requires the security
owner where available. Where prior approval is genuinely impossible, the person
applying the fix records the reason and obtains retrospective approval as soon
as practical.

**Emergency powers.** For a production outage or a defective release,
[../EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md) names the release manager the
default acting decision-maker. Those powers are minimal, reversible where
possible, and time-bound; they expire after 72 hours unless the
[TSC](../TSC.md) extends them in writing, and they are never a standing
mandate. Two constraints bear directly on the role:

- **No self-ratification.** The acting decision-maker's own vote does not count
  toward the majority required to uphold their action, and they cannot be the
  sole ratifier.
- **Every action is ratified after the fact.** The acting decision-maker files
  the emergency decision record within 24 hours and the
  [TSC](../TSC.md) reviews it within 72 hours. An action that is not ratified
  lapses and reverts to the pre-emergency state; silence is not approval.

Emergency powers never authorize changes to governance documents, to
[../MAINTAINERS.md](../MAINTAINERS.md), or to `.github/CODEOWNERS`, and they
never authorize a contract upgrade that bypasses its own process.

**Rollback and retraction.** Where a release is found defective after
publication, the release manager may retract it as
[../RELEASE_POLICY.md](../RELEASE_POLICY.md) describes: mark the tag and
artefacts as deprecated or yanked where the registry allows, open a patch
release immediately, and communicate the retraction and the safe version in the
project channel. A retraction is announced, never silent, and it is documented
in `CHANGELOG.md` with an explanation. A retraction is a release action, so the
same approvals apply to the corrective release.

## Expectations

- **The maintainer baseline applies.** A release manager is a maintainer, so the
  responsiveness expectations in [MAINTAINER.md](MAINTAINER.md) apply: review
  requests are acknowledged within **3 working days**, and governance or
  security matters within **1 working day**. A release request, a release-
  blocking defect, a freeze notice, and a hotfix request fall inside that
  baseline; the release manager acknowledges, acts, or states a timeline.
- **No sign-off on a known-broken release.** If CI is red, or the changelog is
  incomplete, or the version bump is wrong, the release does not proceed. The
  release manager says which of these is blocking rather than tagging around it.
- **Accurate announcements.** The announcement states what changed, what did
  not, and any known issue, without overstating what the project commits to,
  consistent with [../ROLES.md](../ROLES.md).
- **Records stay on the record.** The release issue, the approvals, the tag,
  and any retraction stay linked to the release, so the next release manager can
  see what happened.

## Conflicts of interest

- **A release manager is never the sole approver of their own release.** The
  additional maintainer — and, for a release containing a security fix, the
  security owner — is required by
  [../RELEASE_POLICY.md](../RELEASE_POLICY.md), and that requirement stands
  regardless of how small the release is.
- **Contributions are disclosed.** Where the release manager authored or
  materially contributed to a change included in the release, they say so in
  the release issue, and the additional maintainer reviews that part
  independently. The same principle as the reviewer conflict rule in
  [REVIEWER.md](REVIEWER.md) applies.
- **Recusal hands the role over.** A release manager with a material conflict of
  interest on a release does not sign it off; the deputy takes the rotation for
  that release. If no unconflicted maintainer is available, the release waits or
  the decision escalates per
  [../CONFLICT_RESOLUTION.md](../CONFLICT_RESOLUTION.md).

## Appointment and removal

- **The role is filled from the maintainer roster.** A release manager is
  appointed by agreement of the maintainers, as
  [../MAINTAINERS.md](../MAINTAINERS.md) and [../ROLES.md](../ROLES.md)
  describe for maintainers, and the rotation entry — holder and deputy — is
  recorded in [../MAINTAINERS.md](../MAINTAINERS.md) through a pull request
  against that file.
- **The role is a turn, not a promotion.** A maintainer who is not on call holds
  no release authority, and the appointment carries no authority beyond the
  rotation.
- **Handover and departure.** A release manager who steps down, is removed, or
  takes leave hands the rotation to the deputy and updates the roster. Removal
  of the underlying maintainership follows
  [../MAINTAINER_ELECTIONS.md](../MAINTAINER_ELECTIONS.md), and the access
  revocation step is the one in [../OFFBOARDING.md](../OFFBOARDING.md). An
  in-flight release is handed over explicitly, never dropped.
- **Ownership records stay consistent.** A change that also alters who reviews a
  path is tracked as a separate, code-scoped change to `.github/CODEOWNERS`, as
  [../MAINTAINERS.md](../MAINTAINERS.md) requires.

## Related documents

- [../RELEASE_POLICY.md](../RELEASE_POLICY.md) — the release process,
  approvals, changelog, and rollback this role runs.
- [../BRANCHING_STRATEGY.md](../BRANCHING_STRATEGY.md) — release branch
  naming, flow, and cleanup.
- [../VERSIONING.md](../VERSIONING.md) — version classification and tagging.
- [../HOTFIX_POLICY.md](../HOTFIX_POLICY.md) — code freeze and hotfix
  approval.
- [../EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md) — emergency authority and
  retroactive ratification.
- [../THRESHOLDS.md](../THRESHOLDS.md) — change classes and approval
  thresholds.
- [../ROLES.md](../ROLES.md) — the project-wide role and permission matrices.
- [../MAINTAINERS.md](../MAINTAINERS.md) — the roster and the recorded
  rotation.
- [MAINTAINER.md](MAINTAINER.md) — maintainer duties, rights, and
  responsiveness.
- [../MAINTAINER_ELECTIONS.md](../MAINTAINER_ELECTIONS.md) — appointment and
  removal.
- [../OFFBOARDING.md](../OFFBOARDING.md) — access revocation and handover on
  departure.
