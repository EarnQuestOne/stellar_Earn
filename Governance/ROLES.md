# Roles and Responsibilities

## Purpose

This document is the index of every role in the project and the matrix that
maps each role to its responsibilities and permissions. The individual role
documents linked below hold the detail; this file exists so that the
project-wide picture lives in one place.

Every holder of a role is expected to follow the decisions, review, and
security policies referenced throughout [README.md](README.md). A role grants
authority *subject to those policies*, not in place of them.

## Role index

| Role                                    | Detail                                             |
| --------------------------------------- | -------------------------------------------------- |
| Contributor                             | [CONTRIBUTING.md](../CONTRIBUTING.md)              |
| Reviewer                                | [roles/REVIEWER.md](roles/REVIEWER.md)             |
| Maintainer                              | [roles/MAINTAINER.md](roles/MAINTAINER.md)         |
| Triager                                 | [TRIAGE_POLICY.md](TRIAGE_POLICY.md)               |
| Release manager                         | [RELEASE_POLICY.md](RELEASE_POLICY.md)             |
| Security response team                  | [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md)   |
| Technical steering committee (TSC)      | [WORKING_GROUPS.md](WORKING_GROUPS.md)             |

The current holders of the reviewer, maintainer, and similar roles are listed
in [MAINTAINERS.md](MAINTAINERS.md) and reflected in `.github/CODEOWNERS`.

## Responsibilities matrix

`P` = primary owner, `S` = supports, `—` = not expected.

| Responsibility                          | Contributor | Reviewer | Maintainer | Triager | Release manager | Security team |
| --------------------------------------- | :---------: | :------: | :--------: | :-----: | :-------------: | :-----------: |
| Open issues / pull requests             |      P      |    S     |     S      |    S    |        —        |       S       |
| Triage and label incoming issues        |      —      |    S     |     S      |    P    |        —        |       S       |
| Review changes in own area              |      —      |    P     |     S      |    —    |        —        |       S       |
| Merge changes to the default branch     |      —      |    —     |     P      |    —    |        —        |       —       |
| Cut and announce releases               |      —      |    —     |     S      |    —    |        P        |       —       |
| Handle vulnerability reports            |      —      |    —     |     S      |    —    |        —        |       P       |
| Decide governance / policy changes      |      —      |    S     |     P      |    —    |        —        |       S       |
| Maintain CI, CODEOWNERS, and tooling    |      S      |    S     |     P      |    —    |        S        |       —       |
| Ratify emergency actions after the fact |      —      |    —     |     P      |    —    |        S        |       P       |

## Permissions matrix

| Permission                                   | Contributor | Reviewer | Maintainer | Triager | Release manager | Security team |
| -------------------------------------------- | :---------: | :------: | :--------: | :-----: | :-------------: | :-----------: |
| Push to personal fork / topic branches       |      P      |    P     |     P      |    P    |        P        |       P       |
| Push to protected default branch             |      —      |    —     |     P      |    —    |        —        |       —       |
| Approve a pull request                       |      —      |    P     |     P      |    —    |        —        |       P¹      |
| Request changes (blocking review)            |      —      |    P     |     P      |    —    |        —        |       S       |
| Apply / remove triage labels                 |      —      |    S     |     P      |    P    |        —        |       S       |
| Merge to default branch                      |      —      |    —     |     P      |    —    |        S²       |       —       |
| Create a release tag                         |      —      |    —     |     P      |    —    |        P        |       —       |
| Access private vulnerability reports         |      —      |    —     |     S      |    —    |        —        |       P       |
| Invoke emergency powers                      |      —      |    —     |     P      |    —    |        S        |       P³      |

¹ Security team approvals count for security-sensitive paths; they do not
replace code-owner review elsewhere.
² A release manager may merge only release/hotfix branches, as defined in
[RELEASE_POLICY.md](RELEASE_POLICY.md) and [HOTFIX_POLICY.md](HOTFIX_POLICY.md).
³ Within the limits defined by [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md); all
such actions require retroactive ratification.

## Moving between roles

A contributor moves to reviewer, and a reviewer to maintainer, by demonstrating
sustained contribution in the relevant area and by the approval of the current
holders, per [MAINTAINERS.md](MAINTAINERS.md). A role may be vacated voluntarily
at any time, or removed by consensus of the maintainers for sustained
inactivity or a Code of Conduct violation. Role changes are recorded in
[MAINTAINERS.md](MAINTAINERS.md) and, where applicable, `.github/CODEOWNERS`.

## Conflicts

Where this matrix and a role's own document disagree, the role's own document
governs the detail and this matrix is corrected. Where either conflicts with
[CHARTER.md](CHARTER.md), the charter governs.
