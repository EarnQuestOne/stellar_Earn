# Security Response Team Role

## Purpose

This document defines the security response team: its composition, authority,
and the confidentiality expectations that apply to its work. It complements
[../ROLES.md](../ROLES.md) and the repository-level reporting instructions in
[`SECURITY.md`](../../SECURITY.md).

## Composition

The security response team is a small, named group rather than a standing
committee. It is composed of:

- **At least two** maintainers or reviewers with security experience, so that
  no single person is a bottleneck and no report depends on one individual;
- **One coordinating lead**, who is the first point of contact, owns
  communication with reporters, and drives each case to closure; and
- **Additional members as needed**, brought in for a specific case by the lead
  when the affected area requires specialist knowledge, and removed from that
  case when it closes.

Current members are listed with the other role holders in
[../MAINTAINERS.md](../MAINTAINERS.md). A member leaves the team by stepping
down, or by consensus of the maintainers for inactivity or a Code of Conduct
violation. The team must never be reduced below two members.

## Authority

Within the limits of [../EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md), the team
may:

- **Triage and classify** incoming vulnerability reports and set their severity.
- **Direct the response** for a confirmed vulnerability, including assigning
  fix work and coordinating the people involved.
- **Request an out-of-band fix**, which maintainers are expected to prioritise
  over routine work, and **require a security review** on any change that
  touches affected code.
- **Invoke emergency powers** when a vulnerability threatens users' funds or
  keys, subject to retroactive ratification by the maintainers.
- **Coordinate disclosure**, including setting and extending an embargo, and
  publishing an advisory once a fix is available.
- **Reject a report** as out of scope or not a vulnerability, with a written
  explanation, or **escalate** it when it concerns a dependency or upstream.

The team's authority is over the _process and priority_ of security work, not
over the project's direction: product and roadmap decisions remain with the
maintainers, and any emergency action is reviewed by them afterwards.

## Confidentiality

Security work is confidential until disclosure:

- **Need to know only.** Report details are shared only with the team and the
  contributors needed to fix the issue;
- **Private channels.** Reports, proof-of-concepts, and discussions stay in the
  repository's private security channels (the private reporting form and the
  team's private space), never in public issues or pull requests;
- **No retaliation.** Good-faith reporting is protected regardless of outcome,
  and the reporter's identity is not disclosed without their consent;
- **Coordinated disclosure.** Details become public only via the agreed
  advisory, after a fix is available or the embargo has elapsed;
- **Records.** After closure, a blameless postmortem following
  [../templates/POSTMORTEM_TEMPLATE.md](../templates/POSTMORTEM_TEMPLATE.md) is
  written, with sensitive details redacted.

## Reporting a vulnerability

Do not open a public issue. Follow the process in
[`SECURITY.md`](../../SECURITY.md) and use
[../templates/DISCLOSURE_TEMPLATE.md](../templates/DISCLOSURE_TEMPLATE.md) for
the report. The team acknowledges a report within **1 working day** and provides
an initial assessment within **5 working days**.

## Accountability

The team reports to the maintainers. Each case ends with a postmortem, and the
team reviews its own process periodically to confirm that response times,
severity classifications, and disclosure decisions remain sound.
