# Leadership and Council Model

## Purpose

This document describes how top-level leadership works at StellarEarn: is there
a council, a lead, or neither, who is accountable for what, and how
accountability is renewed. It complements [CHARTER.md](CHARTER.md) (authority),
[TSC.md](TSC.md) (technical authority), and [ROLES.md](ROLES.md) (role matrix).

## The model at a glance

StellarEarn uses a **maintainer collective with a rotating facilitator**, not a
board and not a single owner.

- **The council** is the set of maintainers, acting together as the
  [Technical Steering Committee](TSC.md). There is no separate, appointed
  council above them.
- **The lead** is a **chair** chosen by the maintainers on a rotating basis to
  facilitate decisions and represent the project. The chair is primus inter
  pares: they coordinate, they do not rule.
- **Accountability** runs downward to the project and its contributors, and is
  exercised through transparent decisions, the maintainer roster, and the
  governance documents — not through a private hierarchy.

This is deliberately a light structure: the project is small enough that a
single collective can hold both technical and stewardship authority, and any
heavier structure would add layers without adding accountability.

## Roles in the model

| Position          | Who                              | What they are accountable for                                                        |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Maintainer council | Active maintainers ([MAINTAINERS.md](MAINTAINERS.md)) | Final decisions: merging changes, governance, releases, and appointments |
| Chair / facilitator | One maintainer, rotated by the council | Running the decision process, being the external point of contact, and reporting outcomes |
| Area owners        | Maintainer or reviewer per area ([SUBPROJECTS.md](SUBPROJECTS.md)) | Technical direction and review within their area |
| Security lead      | Coordinating member of the [security response team](roles/SECURITY_TEAM.md) | Security incidents and disclosure |

The chair does **not** have a veto. On a deadlock, the tie-breaking rules in
[TIE_BREAKING.md](TIE_BREAKING.md) apply, and the chair's role is to run that
process, not to substitute for it.

## Terms

- **Maintainer seats** are not term-limited; a person remains a council member
  while they are an active maintainer. This avoids artificial turnover while
  keeping the roster honest about inactivity.
- **The chair** serves a **renewable six-month term**. Selection is by the
  maintainers at the end of each term, or sooner if the chair steps down. A
  term can be shortened only by the chair resigning or by the council choosing a
  new chair by the normal decision process.
- **Handover** should be documented in the meeting/decision records so the next
  chair does not start from scratch.

## Accountability

The council is accountable through:

- **Transparency** — decisions are recorded in the decision log
  ([decisions/README.md](decisions/README.md)), and governance changes land as
  pull requests.
- **The charter** — the council's authority is bounded by [CHARTER.md](CHARTER.md),
  which the council cannot amend without the maintainer approval described there.
- **The Code of Conduct** — leadership is subject to the same conduct rules as
  everyone else, enforced through [COC_REPORTING.md](COC_REPORTING.md); a
  maintainer is not the judge of their own conduct case.
- **The roster** — who holds leadership positions is always visible in
  [MAINTAINERS.md](MAINTAINERS.md), and the roster is reviewed at least
  quarterly.
- **Removal** — a maintainer, including the chair, may be removed by consensus
  of the other maintainers for sustained inactivity or a Code of Conduct
  violation, per [roles/MAINTAINER.md](roles/MAINTAINER.md). Removal is not
  punitive and re-appointment is possible.

## What this model does not have

For clarity, there is no:

- separate elected "board" distinct from the maintainers;
- permanent or hereditary leadership position;
- single founder veto over governance decisions; or
- leadership authority that can set aside the security or conduct processes.

If the project grows to the point where a different model is warranted, this
document is amended through the process it describes — via the maintainer
approval and decision-record requirements in [TSC.md](TSC.md) and
[CHARTER.md](CHARTER.md), never unilaterally.
