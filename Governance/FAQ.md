# Governance FAQ

Short answers to the questions newcomers ask most often. Each answer links to
the document that holds the full detail; where this FAQ and a policy disagree,
the policy wins.

## Getting started

**I found a bug or have an idea. What do I do?**
Open an issue. You do not need permission to propose work, and you do not need
to be a maintainer. See [TRIAGE_POLICY.md](TRIAGE_POLICY.md) for how issues are
handled after you file one.

**Can I just send a pull request?**
Yes. Small, self-contained fixes are the fastest way to contribute. Read
[../CONTRIBUTING.md](../CONTRIBUTING.md) and
[PR_GUIDELINES.md](PR_GUIDELINES.md) first so your change is easy to review.

**Who can contribute?**
Anyone. There is no formal membership gate. Sustained, high-quality
contributions are how people move into reviewer and maintainer roles
([ROLES.md](ROLES.md)).

## How decisions are made

**Who decides what gets merged?**
Maintainers merge changes ([roles/MAINTAINER.md](roles/MAINTAINER.md)).
Reviewers in an area can approve a change, but merging is a maintainer action
([roles/REVIEWER.md](roles/REVIEWER.md)).

**How are decisions made when people disagree?**
Consensus first. If consensus fails, the project follows
[VOTING.md](VOTING.md), [QUORUM.md](QUORUM.md), and
[TIE_BREAKING.md](TIE_BREAKING.md). Unresolved conflicts escalate per
[CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md).

**How do I propose a change to governance itself?**
Open a pull request that edits the relevant `Governance/` document and links
the governance issue that motivates it. Governance changes need maintainer
approval and follow the amendment rules in [CHARTER.md](CHARTER.md).

**Who decides which area a change belongs to, or whether it is cross-area?**
The area owners first ([SUBPROJECTS.md](SUBPROJECTS.md)); if they disagree, the
maintainers decide.

## Policies and boundaries

**Can I change the license or fork the project?**
Forking is allowed. Changing the project license requires a supermajority of
maintainers and contributor sign-off — see [FORK_POLICY.md](FORK_POLICY.md).

**I found a security vulnerability. Where do I report it?**
Not in a public issue. Follow [`SECURITY.md`](../SECURITY.md) and the
[security response team](roles/SECURITY_TEAM.md) process.

**What are the rules for adding a dependency?**
See [DEPENDENCY_POLICY.md](DEPENDENCY_POLICY.md).

**How do releases and version numbers work?**
See [RELEASE_POLICY.md](RELEASE_POLICY.md) and [VERSIONING.md](VERSIONING.md).

**What is in scope for the project?**
The mission, in-scope work, and explicit non-goals are in
[MISSION.md](MISSION.md). The charter ([CHARTER.md](CHARTER.md)) is the
authoritative scope statement.

## Roles

**How do I become a reviewer or maintainer?**
By demonstrating sustained contribution and review in an area, sponsored by an
existing role holder and agreed by the maintainers —
[roles/REVIEWER.md](roles/REVIEWER.md) and
[roles/MAINTAINER.md](roles/MAINTAINER.md).

**Who is currently a maintainer?**
[MAINTAINERS.md](MAINTAINERS.md).

**A maintainer has gone quiet. What happens?**
Sustained inactivity may lead to removal by consensus of the remaining
maintainers; see [roles/MAINTAINER.md](roles/MAINTAINER.md).

## Still stuck?

Read [README.md](README.md) for the full governance index, or open an issue
labelled `governance` and a maintainer will point you at the right document.
