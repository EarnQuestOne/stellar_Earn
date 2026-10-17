# Maintainer Offboarding and Emeritus Process

## Purpose

This document defines how a maintainer steps down or is removed, how their
access is revoked, and how the project recognizes former maintainers through
**emeritus** status. It is the operational counterpart to the roster
([MAINTAINERS.md](MAINTAINERS.md)), the role description
([roles/MAINTAINER.md](roles/MAINTAINER.md)), and the election/removal rules
([MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md)).

Offboarding is a routine, non-punitive event. It exists to keep the project
secure (access is revoked promptly) and respectful (departing maintainers are
credited, not erased).

## When This Process Applies

- **Voluntary step-down** — a maintainer resigns by notifying the other
  maintainers or opening a pull request that moves them off the active roster.
- **Removal by consensus / vote** — for sustained inactivity or a Code of
  Conduct violation, per [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) and
  [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md).
- **Automatic inactivity review** — surfaced during the quarterly roster review
  in [MAINTAINERS.md](MAINTAINERS.md).

A departing maintainer may choose **emeritus** status (default for voluntary
departures in good standing) or a clean removal. Removal for a Code of Conduct
or security violation does not confer emeritus status.

## Offboarding Steps

1. **Announce.** The maintainer (or, for a removal, the vote initiator) records
   the decision and its effective date on the relevant issue or PR.
2. **Update the roster.** Open a PR against [MAINTAINERS.md](MAINTAINERS.md)
   moving the person from *Active maintainers* to *Emeritus / former
   maintainers*, with their areas and the effective date.
3. **Reassign areas.** Ensure every area the person owned has an active owner so
   no path goes unowned; coordinate with the remaining maintainers.
4. **Revoke access** using the checklist below.
5. **Hand over in-flight work.** Transfer open reviews, in-progress RFCs,
   pending security items, and any secrets-only-in-their-possession to a
   remaining maintainer.
6. **Record the change** as described in
   [How the Change Is Recorded](#how-the-change-is-recorded).

Per the governance scope rule, this PR is limited to at most two files inside
`Governance/`. Any required change to `.github/CODEOWNERS` (which lives outside
`Governance/`) is tracked as a separate, code-scoped change, and the two files
must not disagree for more than one release cycle.

## Access Revocation Checklist

Access revocation begins **on the effective date** and completes within
**5 business days** (within **24 hours** for a security- or Code of Conduct-related
removal). One remaining maintainer owns the checklist and confirms completion on
the offboarding record.

**Repository and organization**

- [ ] Remove the person from the GitHub organization, or drop them to the
      minimum necessary membership.
- [ ] Remove **admin** and **write** permissions on all repositories.
- [ ] Remove them from `.github/CODEOWNERS` (separate, code-scoped change).
- [ ] Remove from any GitHub **teams** that grant review, merge, or admin rights.
- [ ] Revoke membership in protected-branch / ruleset bypass lists.

**Secrets, keys, and signing**

- [ ] Rotate or reassign any **Stellar/Soroban signing keys**, deployer keys, or
      contract-admin identities held by the person.
- [ ] Rotate shared secrets they had access to (env vars, CI/CD secrets, vault
      entries, `.env`-distributed credentials).
- [ ] Revoke or reissue **npm / package-registry** publish tokens and org seats.
- [ ] Remove them as an owner on any **cloud / infrastructure** accounts
      (hosting, monitoring, DNS, domains).

**Automation and integrations**

- [ ] Revoke personal access tokens, deploy keys, and app installations tied to
      them.
- [ ] Remove them from CI/CD, monitoring, and alerting notification lists.
- [ ] Remove maintainer-scoped access to any third-party dashboards (Sentry,
      Grafana, etc.).

**Communication and accounts**

- [ ] Remove from private maintainer channels, mailing lists, and shared drives.
- [ ] Remove from private security-reporting channels per
      [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md), unless they remain on the
      security team in another capacity.
- [ ] Confirm two-factor authentication state where the project requires it and
      transfer ownership of any shared/org-owned accounts.

Access revocation is verified — not assumed: the owning maintainer confirms each
item and notes any rotations performed on the offboarding record.

## Emeritus Status

**Emeritus maintainers** are former maintainers recognized for their
contributions who left in good standing.

- **Recognition.** They remain listed in the *Emeritus / former maintainers*
  section of [MAINTAINERS.md](MAINTAINERS.md) with their areas and tenure. They
  are credited in release notes and project history.
- **No active authority.** Emeritus status carries **no** merge, admin, voting,
  or governance rights. Emeritus maintainers do not count toward quorum or
  eligibility in [VOTING.md](VOTING.md) or
  [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md).
- **Advisory role.** They may be consulted, review PRs as community members, and
  provide historical context, but their review is not a blocking approval.
- **Returning to active.** An emeritus maintainer may be re-instated as an
  active maintainer through the same appointment process used for new
  maintainers ([MAINTAINERS.md](MAINTAINERS.md)); their emeritus entry is moved
  back to *Active maintainers* and access is re-granted per onboarding.
- **Opt out.** An emeritus maintainer may request to be listed only as a former
  maintainer, or removed from the roster entirely; such a request is honored.

## How the Change Is Recorded

- **Roster PR** — the merged PR updating [MAINTAINERS.md](MAINTAINERS.md) is the
  primary record (name, area, effective date, emeritus vs. removal).
- **Access checklist** — completion of the access-revocation checklist is
  confirmed on the offboarding issue or PR. Confidential evidence (for
  security/CoC removals) stays in the applicable restricted process and is not
  exposed in the public record.
- **Vote tally** — for removals decided by vote, the tally summary required by
  [VOTING.md](VOTING.md) is posted on the record.

## Related Documents

- [MAINTAINERS.md](MAINTAINERS.md) — the active and emeritus roster.
- [roles/MAINTAINER.md](roles/MAINTAINER.md) — the maintainer role, duties, and stepping back.
- [MAINTAINER_ELECTIONS.md](MAINTAINER_ELECTIONS.md) — appointment, removal, and voluntary departure.
- [VOTING.md](VOTING.md) — voting procedure, quorum, and eligibility.
- [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md) — escalation for contested removals.
- [roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md) — security-reporting access.
