# Community Moderator Role

## Purpose

This document describes the community moderator role: what moderators do, the
actions they may take on their own, and when and how they escalate to
maintainers and the CoC Committee. It complements
[../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), which sets the standards being
upheld, [../COC_REPORTING.md](../COC_REPORTING.md), which defines how conduct
reports are investigated, and [../ROLES.md](../ROLES.md), which places each role
in the project-wide matrix.

## What a moderator is

A moderator is a community member trusted to keep the project's shared spaces
welcoming, on-topic, and free of spam and abuse. Where a
[triager](TRIAGER.md) looks after the _content_ of the issue queue, a moderator
looks after the _conduct_ in it and in every other community space.

Moderators are first responders, not judges. They act quickly on clear,
low-severity problems and hand anything serious or contested to the people who
hold the authority to decide it. Maintainers may moderate by default; the
moderator role exists so that this work can be shared without granting merge
or governance authority.

## Where moderators act

Moderation applies to the project spaces listed in
[../COMMUNICATION.md](../COMMUNICATION.md) and covered by the
[Code of Conduct scope](../CODE_OF_CONDUCT.md#scope):

- comments on GitHub issues, pull requests, and reviews;
- GitHub Discussions; and
- the project's community chat (Discord, Telegram, or equivalent).

A moderator may be appointed for all spaces or for specific ones; the scope is
recorded alongside their name in [../MAINTAINERS.md](../MAINTAINERS.md).

## Duties

A moderator:

- **Watches community spaces** for spam, abuse, harassment, and off-topic
  derailment, and responds promptly.
- **Removes spam** — promotional posts, scams, phishing links, and bot
  activity — without waiting for a report.
- **Redirects off-topic or misplaced discussion** to the right channel (for
  example, a support question in a pull request moved to Discussions).
- **De-escalates heated threads** with a short, neutral reminder of the
  [Code of Conduct](../CODE_OF_CONDUCT.md) and, if needed, a cooling-off lock.
- **Protects sensitive information** — hides posts that expose personal data,
  credentials, or an undisclosed vulnerability, and routes vulnerabilities to
  the security response team ([SECURITY_TEAM.md](SECURITY_TEAM.md)).
- **Points people to private reporting** — when someone raises a conduct
  concern in public, directs them to [../COC_REPORTING.md](../COC_REPORTING.md)
  rather than discussing it in the open.
- **Escalates** anything beyond their authority, following the
  [escalation path](#escalation-path) below.
- **Records every action** they take, as described under
  [Transparency and records](#transparency-and-records).

## Permissions

A moderator may, on their own authority:

- **hide, minimize, or delete** comments and chat messages that are spam, that
  expose personal or security-sensitive data, or that clearly breach the Code
  of Conduct;
- **edit** a post only to redact personal data, credentials, or security
  details — never to change its meaning;
- **lock** an issue, pull request, or discussion thread for up to **72 hours**
  as a cooling-off measure;
- **move or close** off-topic threads and discussions with a short explanation;
- **apply a chat timeout or slow mode** of up to **24 hours**;
- **ban accounts that are unambiguously spam or bots**; and
- **give a private or public reminder** of the Code of Conduct, equivalent to
  the "Correction" step in the
  [enforcement guidelines](../CODE_OF_CONDUCT.md#enforcement-guidelines).

A moderator may **not**:

- issue a formal **warning, temporary ban, or permanent ban** to a human
  participant — those outcomes are decided by the CoC Committee under
  [../COC_REPORTING.md](../COC_REPORTING.md);
- **investigate** a conduct report, contact witnesses, or determine its
  outcome;
- merge pull requests, approve changes, or close a pull request on technical
  grounds;
- change repository settings, branch protection, or anyone's access; or
- lock a thread beyond 72 hours, or lock one to end a technical disagreement
  that is still being decided.

Moderation authority applies to _conduct and channel hygiene_, not to technical
or governance decisions.

## Escalation path

Moderators escalate by the nature of the problem, not by who is involved.

| Situation                                                                             | Escalate to                                                                            | How                                                                | Target                             |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| Conduct beyond a simple correction: harassment, repeated violations, threats, doxxing | CoC Committee                                                                          | Private channel in [../COC_REPORTING.md](../COC_REPORTING.md)      | Same day                           |
| Immediate risk to someone's safety                                                    | CoC Committee (and emergency services, per [../SAFETY_POLICY.md](../SAFETY_POLICY.md)) | Private channel, marked urgent                                     | Immediately                        |
| Suspected security vulnerability posted publicly                                      | Security response team                                                                 | Private disclosure process in [SECURITY_TEAM.md](SECURITY_TEAM.md) | Immediately, after hiding the post |
| A lock or timeout needs to last longer than the moderator's limit                     | Any maintainer                                                                         | Private message to a maintainer, linking the action log            | Before the limit expires           |
| A dispute about project direction or a technical decision that has turned heated      | Area maintainer, then per [../CONFLICT_RESOLUTION.md](../CONFLICT_RESOLUTION.md)       | Comment on the thread tagging the area maintainer                  | Within 1 business day              |
| Access, permissions, or repository settings need to change                            | Maintainers                                                                            | Private message to a maintainer                                    | Within 1 business day              |
| The moderator is unsure whether or how to act                                         | Any maintainer                                                                         | Private message to a maintainer                                    | As soon as practical               |

When escalating:

1. **Contain first.** Hide the content or lock the thread if leaving it visible
   would cause further harm; that is within a moderator's authority.
2. **Hand over the evidence.** Share links, screenshots, and timestamps
   privately — never repost harmful content in public.
3. **Step back.** Once a matter is with the CoC Committee, the security team,
   or a maintainer, the moderator does not act further on it unless asked.

If a maintainer or CoC Committee member is the subject of the concern, the
moderator escalates to another CoC Committee member or to the TSC
([../TSC.md](../TSC.md)), as [../COC_REPORTING.md](../COC_REPORTING.md) provides.

## Conflicts of interest

A moderator does not moderate a thread in which they are a participant in the
disagreement, or a person with whom they have a close personal or professional
relationship. In that case they ask another moderator or a maintainer to act
instead.

## Transparency and records

- Every moderation action is logged in the private moderation log kept by the
  maintainers: what was done, where, when, by whom, and why.
- Where appropriate, the moderator leaves a short public note on the thread
  (for example, "Locked for 72 hours as a cooling-off period, see the Code of
  Conduct"), as the Code of Conduct requires moderators to explain their
  decisions when appropriate.
- Removed content is preserved privately where the platform allows, so that it
  can be reviewed on appeal or by the CoC Committee.

## Appeals

Anyone affected by a moderation action may ask for it to be reviewed by
contacting any maintainer privately. A maintainer who was not involved in the
original action reviews it and may uphold, shorten, or reverse it. Appeals of
CoC Committee outcomes follow the appeals process in
[../COC_REPORTING.md](../COC_REPORTING.md#appeals) instead.

## Appointment and removal

- **Nomination.** Any maintainer may nominate a contributor who has shown
  sustained, constructive participation and sound judgement in community
  spaces. Self-nominations are welcome.
- **Approval.** A moderator is appointed by lazy consensus of the maintainers,
  per [../DECISION_MAKING.md](../DECISION_MAKING.md).
- **Onboarding.** A new moderator reads this document, the
  [Code of Conduct](../CODE_OF_CONDUCT.md), and
  [../COC_REPORTING.md](../COC_REPORTING.md), and is given moderator permissions
  only in the spaces they are appointed to.
- **Record.** Moderators and their scope are listed in
  [../MAINTAINERS.md](../MAINTAINERS.md).
- **Stepping down or removal.** A moderator may step down at any time. The role
  may be removed by consensus of the maintainers for sustained inactivity,
  misuse of moderation powers, or a Code of Conduct violation, following the
  access-revocation steps in [../OFFBOARDING.md](../OFFBOARDING.md).

## Expectations

- **Responsiveness.** Act on spam and clear abuse promptly when on duty, and
  acknowledge escalation requests within one business day.
- **Proportionality.** Use the lightest action that resolves the problem; a
  reminder before a lock, a lock before an escalation.
- **Neutrality.** Apply the same standards to everyone, including maintainers
  and long-standing contributors.
- **Confidentiality.** Keep reports, reporters' identities, and escalation
  details private, as [../COC_REPORTING.md](../COC_REPORTING.md#confidentiality)
  requires.
- **Tone.** Moderation messages are short, calm, and specific, and follow the
  [inclusive language guideline](../INCLUSIVE_LANGUAGE.md).

## Related documents

- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) — the standards moderators uphold.
- [../COC_REPORTING.md](../COC_REPORTING.md) — how conduct reports are handled.
- [../SAFETY_POLICY.md](../SAFETY_POLICY.md) — prohibited behaviours and safety response.
- [../COMMUNICATION.md](../COMMUNICATION.md) — the channels moderation covers.
- [../CONFLICT_RESOLUTION.md](../CONFLICT_RESOLUTION.md) — resolving non-conduct disputes.
- [../ROLES.md](../ROLES.md) — the project-wide role and permission matrices.
- [TRIAGER.md](TRIAGER.md), [MAINTAINER.md](MAINTAINER.md),
  [SECURITY_TEAM.md](SECURITY_TEAM.md) — neighbouring roles.
