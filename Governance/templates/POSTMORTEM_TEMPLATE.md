# Postmortem: <incident title>

> **Status:** <draft / complete> | **Created:** <YYYY-MM-DD>
> A postmortem is written after an incident to understand what happened and
> to prevent recurrence. It is **blameless**: it records facts, systems, and
> process failures, never individual fault. Every sentence must describe the
> incident without assigning fault to any person.

## Summary

<2-3 sentences describing what happened and its impact, written in neutral
language. Example: "The submission-query endpoint returned 500 errors for
twenty minutes because the shared database connection pool was exhausted.
No data was lost; reads and writes were restored after a pool increase.">

## Impact

<What was affected and for how long: user-visible behaviour, uptime, data,
latency, or error rates. Quantify where possible.>

## Timeline

All times are UTC.

| Time (UTC)         | Event           |
| ------------------ | --------------- |
| <YYYY-MM-DD HH:MM> | <what happened> |
| <YYYY-MM-DD HH:MM> | <next event>    |

## Root cause

<The underlying condition that led to the incident. Describe the system and
the gap in process or configuration that allowed it, without blaming people.>

## Detection

<How the incident was noticed: alert, user report, or CI. Include how long
between the first sign and the first responder.>

## Resolution

<What restored service, who did it, and when. Include the rollback, fix, or
workaround that ended the incident.>

## Actions

Follow-ups are tracked here and in the linked issue until all are closed.

| Action               | Owner    | Due (UTC)    | Status        |
| -------------------- | -------- | ------------ | ------------- |
| <concrete follow-up> | <handle> | <YYYY-MM-DD> | <open / done> |

## Lessons learned

- <What worked well>
- <What should be done differently>
- <What the team will watch for next time>

## Blameless language guidance

- Describe systems, not people: "the pool exhausted" not "the operator."
- Never start a section with a person's name.
- Record the fact that someone acted, not a judgement of the action.
- If a person made a decision that contributed, mark it as a process gap
  (missing check, unclear runbook) rather than a fault.