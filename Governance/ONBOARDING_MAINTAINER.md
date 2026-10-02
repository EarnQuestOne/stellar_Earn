# Maintainer Onboarding Checklist

## Purpose

This document is the step-by-step path by which a contributor or reviewer
becomes a maintainer: the steps that must be completed, the access a new
maintainer needs, and how the change is recorded. It is the mirror image of
[OFFBOARDING.md](OFFBOARDING.md), which is the reverse path and uses the same
structure — a checklist, an access list, and a record. Where a maintainer
returns from emeritus status, their access is re-granted by following this
document, as [OFFBOARDING.md](OFFBOARDING.md) requires.

Onboarding is not a formality and not a reward for time served. It exists so
that a person who has just been trusted with merge authority understands what
they may do, what they must not do alone, and which records must stay current.

The checklist covers two things that are easy to confuse:

- **The repository record** — files inside `Governance/`, changed by pull
  request.
- **Access on the hosting platform** — repository settings, organization
  membership, teams, tokens, and publication rights, which are not repository
  files and are not covered by the two-file scope rule in
  [MAINTAINERS.md](MAINTAINERS.md).

## Onboarding checklist

The steps are in order. Each one is complete only when it is checked on the
onboarding record.

1. [ ] **Confirm the ladder rung.** The candidate has a sustained record of
       contributions and reviews in the areas they will own, and has worked their
       way up the ladder in [roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md) —
       contributor, then reviewer, per [roles/REVIEWER.md](roles/REVIEWER.md),
       with the support and `good-first-issue` path in
       [MENTORSHIP.md](MENTORSHIP.md) behind it. The record states the areas being
       proposed and the evidence for them.

2. [ ] **Open the nomination.** A nomination follows
       [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md): the candidate's
       confirmation that they are willing to serve, a sponsoring maintainer, the
       evidence from step 1, and the requested areas of responsibility. The
       nomination stays open for at least **7 calendar days** for questions, and
       the candidate does not vote on their own election.

3. [ ] **Obtain maintainer agreement.** The maintainers agree by consensus, or
       by a vote, as [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) and
       [ROLES.md](ROLES.md) require. The vote records the candidate, the proposed
       responsibilities, the eligible voters, the opening and closing dates, and
       the threshold; quorum is determined under [QUORUM.md](QUORUM.md) and a
       maintainer election is a **material governance** change requiring
       **two-thirds of non-abstaining ballots** under
       [THRESHOLDS.md](THRESHOLDS.md). Recorded dissent is captured per
       [DISSENT.md](DISSENT.md).

4. [ ] **Accept the Code of Conduct and the safety policy.** The new maintainer
       reads and accepts the [Code of Conduct](CODE_OF_CONDUCT.md) and the
       [Anti-Harassment and Safety Policy](SAFETY_POLICY.md) in writing on the
       onboarding record. Those obligations apply to maintainers as much as to
       anyone else, and a maintainer is not exempt from them; a report about a
       maintainer follows the same route as any other, per
       [COC_REPORTING.md](COC_REPORTING.md).

5. [ ] **Acknowledge the security disclosure route.** Where the areas being
       taken on touch security-relevant or value-bearing code, the new maintainer
       acknowledges the private reporting route in [`SECURITY.md`](../SECURITY.md)
       and the [disclosure template](templates/DISCLOSURE_TEMPLATE.md): no public
       issue, proof-of-concept, or chat discussion for a vulnerability. They also
       acknowledge that access to private security channels is limited to the
       security response team ([roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md)) and
       is not granted by this checklist on its own.

6. [ ] **Make the access grants.** The sponsoring maintainer works through the
       table below and confirms each grant in the platform, not only in the record.
       Per [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md), a newly elected
       maintainer receives **only** the review, merge, and access rights approved
       for their listed responsibilities — a frontend owner is not granted release
       or security rights by appointment.

7. [ ] **Record the appointment in the roster.** A pull request against
       [MAINTAINERS.md](MAINTAINERS.md) adds the maintainer with their areas, the
       sponsoring maintainer, and the effective date. Per the scope rule in
       [MAINTAINERS.md](MAINTAINERS.md), that change is limited to files inside
       `Governance/`; where it also changes who reviews a path, the
       `.github/CODEOWNERS` counterpart is a separate, code-scoped change, and the
       two must not disagree for more than one release cycle.

8. [ ] **Announce the appointment and hand over in-flight work.** The
       appointment is stated publicly in the project's channel, and any open
       reviews, in-progress proposals, or pending security items the person is
       taking over are named on the record. Private matters are not announced;
       they stay in the applicable private channel per
       [COMMUNICATION.md](COMMUNICATION.md).

## Access grants required

A maintainer's access follows the area they own. The sponsoring maintainer
grants each item below; the grant is refused, or reduced to the minimum
necessary, where the areas on the roster do not justify it.

| Grant                                                               | System it lives in                                                                             | Who approves it                                                                                                          | Policy                                                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Merge rights on the default branch                                  | GitHub branch protection / rulesets on `main`                                                  | Existing maintainers, by the agreement in step 3                                                                         | [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)                                               |
| `write` permission on the repository                                | GitHub repository permissions                                                                  | Existing maintainers                                                                                                     | [MAINTAINERS.md](MAINTAINERS.md)                                                             |
| `admin` permission on the repository                                | GitHub repository settings                                                                     | TSC, and only where a task requires it (for example changing branch-protection rules or merge settings)                  | [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)                                               |
| Membership in a GitHub team that grants review or merge rights      | GitHub organization teams                                                                      | Existing maintainers                                                                                                     | [MAINTAINERS.md](MAINTAINERS.md)                                                             |
| Code-owner entries for the areas they own                           | `.github/CODEOWNERS`                                                                           | The current owner of that path, or a maintainer if the path is unowned                                                   | [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md)                                                 |
| Triage: label, milestone, and assignment permissions                | GitHub issue and pull-request metadata                                                         | Existing maintainers                                                                                                     | [TRIAGE_POLICY.md](TRIAGE_POLICY.md), [roles/TRIAGER.md](roles/TRIAGER.md)                   |
| Access to private vulnerability reports                             | GitHub private vulnerability reporting and the team's private space                            | Security response team, on membership rather than on appointment                                                         | [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md)                                             |
| Release permissions: signing and pushing tags, publishing artefacts | GitHub releases/tags, the configured package registries, and the signing key used for releases | Existing maintainers, recorded as the release rotation                                                                   | [RELEASE_POLICY.md](RELEASE_POLICY.md), [roles/RELEASE_MANAGER.md](roles/RELEASE_MANAGER.md) |
| Publish tokens and organization seats for the registries used       | Package registry (for example npm)                                                             | Existing maintainers, with the token scoped to the minimum needed                                                        | [OFFBOARDING.md](OFFBOARDING.md)                                                             |
| Deployment, hosting, and monitoring accounts                        | Cloud and infrastructure accounts used by CI/CD                                                | Existing maintainers                                                                                                     | [OFFBOARDING.md](OFFBOARDING.md)                                                             |
| Shared secrets and credentials                                      | CI/CD secret store, environment configuration                                                  | Existing maintainers, on a per-secret basis; the value is never shared in a repository file                              | [`SECURITY.md`](../SECURITY.md)                                                              |
| Signing keys, deployer keys, and contract-admin identities          | Key storage used for deployment and contract administration                                    | TSC, and only where the areas listed on the roster require them                                                          | [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md)                                                   |
| Private maintainer channels and shared drives                       | Project communication and storage                                                              | Existing maintainers                                                                                                     | [COMMUNICATION.md](COMMUNICATION.md)                                                         |
| Working-group membership or a group lead role                       | The group's charter, recorded with the TSC                                                     | TSC approves the group; a maintainer sponsors the proposal                                                               | [WORKING_GROUPS.md](WORKING_GROUPS.md)                                                       |
| A seat on the TSC                                                   | Follows maintainership; there is no separate seat                                              | Automatic on being added to [MAINTAINERS.md](MAINTAINERS.md)                                                             | [TSC.md](TSC.md)                                                                             |
| Two-factor authentication on project accounts                       | The account itself, wherever it is held                                                        | The maintainer confirms their own state; a maintainer account with no second factor is raised with the other maintainers | [OFFBOARDING.md](OFFBOARDING.md)                                                             |

Notes on the grants:

- **Access is additive and revocable.** Each grant is reversed by the
  corresponding item in the access-revocation checklist in
  [OFFBOARDING.md](OFFBOARDING.md), on the same terms.
- **Repository files and platform settings are separate.** A grant made in
  GitHub settings leaves no record in the repository, and a `CODEOWNERS` entry
  grants no permission on its own. The two are kept consistent as
  [MAINTAINERS.md](MAINTAINERS.md) requires.
- **Least privilege.** A maintainer holds the access their listed areas
  require, not the access a larger project would grant. Unused access is
  removed rather than left in place, consistent with the least-privilege
  constraint in [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md).
- **Release and security rights are distinct from maintainership.** Being on
  the roster does not make someone the release manager or a member of the
  security response team; those are separate appointments recorded in
  [MAINTAINERS.md](MAINTAINERS.md).

## First week

The first week is for learning the area, not for merging.

- **Observe before approving.** Shadow reviews in the areas being taken on and
  read the open pull requests without approving any of them. The reviewer
  expectations in [roles/REVIEWER.md](roles/REVIEWER.md) — what a review
  checks — are the best guide to what a maintainer's review adds.
- **Pair on the first merges.** The first few merges are made with a
  sponsoring maintainer available, so the second pair of eyes is on the
  process as well as the diff.
- **Read the area's policies.** The documents this folder indexes, starting
  with [README.md](README.md), and the area-specific guidance in
  [SUBPROJECTS.md](SUBPROJECTS.md).
- **Meet the security route.** If step 5 applied, walk one report through the
  [disclosure template](templates/DISCLOSURE_TEMPLATE.md) as a walkthrough, so
  the route is familiar before a real report arrives.
- **Ask in public.** Questions go in the project's public channel or issues
  rather than in private messages, per [COMMUNICATION.md](COMMUNICATION.md).

## Ongoing expectations

Onboarding ends; the role does not. The ongoing expectations are those of
[roles/MAINTAINER.md](roles/MAINTAINER.md), and they are restated here only in
the terms a new maintainer needs on day one:

- acknowledge review requests in the area within **3 working days**, and
  governance or security matters within **1 working day**;
- keep the areas owned in [MAINTAINERS.md](MAINTAINERS.md) and
  `.github/CODEOWNERS` accurate as reality changes;
- uphold the policies in this folder and apply the
  [Code of Conduct](CODE_OF_CONDUCT.md) fairly;
- keep the areas from going unowned, and say so publicly in the project
  channel before going quiet for an extended period;
- mentor reviewers and contributors toward more responsibility, per
  [MENTORSHIP.md](MENTORSHIP.md); and
- expect to be asked to leave: inactivity without notice can result in removal
  by consensus, and removal is not punitive.

## How the change is recorded

This mirrors [OFFBOARDING.md](OFFBOARDING.md), which records its changes the
same way:

- **Roster pull request** — the merged pull request against
  [MAINTAINERS.md](MAINTAINERS.md) is the primary record: name, areas, the
  sponsoring maintainer, and the effective date.
- **Checklist state** — the onboarding checklist is checked on the onboarding
  record, and the summary of what was granted is tracked in
  [MAINTAINERS.md](MAINTAINERS.md), so the roster shows who holds what and why.
- **Access verification** — the sponsoring maintainer confirms each grant in
  the platform and notes any grant that was refused or reduced. Access is
  verified, not assumed, exactly as [OFFBOARDING.md](OFFBOARDING.md) requires
  for revocation.
- **Vote tally** — where agreement was reached by vote, the tally summary
  required by [VOTING.md](VOTING.md) is posted on the record.
- **Code-owner counterpart** — any `.github/CODEOWNERS` change is tracked as
  its own code-scoped change, and the two records must not disagree for more
  than one release cycle.

## Related documents

- [OFFBOARDING.md](OFFBOARDING.md) — the reverse path: step-down, removal,
  access revocation, and emeritus status.
- [MAINTAINERS.md](MAINTAINERS.md) — the roster, the areas, and the rule for
  updating it.
- [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) — nomination, the
  election vote, and removal.
- [ROLES.md](ROLES.md) — the role index and the permission matrices.
- [roles/MAINTAINER.md](roles/MAINTAINER.md) — maintainer duties, rights, and
  responsiveness.
- [roles/REVIEWER.md](roles/REVIEWER.md) — the rung before maintainer, and
  what a review checks.
- [roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md) — the contribution ladder.
- [MENTORSHIP.md](MENTORSHIP.md) — support for new contributors.
- [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md) — assigning and changing path
  ownership.
- [TRIAGE_POLICY.md](TRIAGE_POLICY.md) and [roles/TRIAGER.md](roles/TRIAGER.md)
  — triage duties and the label permissions.
- [RELEASE_POLICY.md](RELEASE_POLICY.md) and
  [roles/RELEASE_MANAGER.md](roles/RELEASE_MANAGER.md) — release permissions
  and the release rotation.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and
  [SAFETY_POLICY.md](SAFETY_POLICY.md) — the conduct obligations a maintainer
  accepts.
- [`SECURITY.md`](../SECURITY.md) — private disclosure and secret handling.
- [WORKING_GROUPS.md](WORKING_GROUPS.md) and [TSC.md](TSC.md) — group
  participation and the technical steering committee.
- [QUORUM.md](QUORUM.md) and [THRESHOLDS.md](THRESHOLDS.md) — eligibility,
  quorum, and the approval threshold for a maintainer election.
- [VOTING.md](VOTING.md) — the vote record.
- [COMMUNICATION.md](COMMUNICATION.md) — where the appointment is announced
  and where questions are asked.
