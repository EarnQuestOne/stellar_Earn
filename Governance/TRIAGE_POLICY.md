# Issue Triage Policy

There has been no documented workflow for triaging incoming issues. This
describes the triage steps and cadence.

## Cadence

Maintainers triage new, unlabeled issues on a regular cadence (at least
weekly), and sooner for anything reporting a security concern or a
production-affecting defect.

## Triage steps

For each new issue, a maintainer:

1. **Classifies the type** — bug, feature request, documentation, question,
   or governance/process — and applies the corresponding label.
2. **Assesses severity/priority** for bugs (e.g. blocking, major, minor) and
   labels accordingly.
3. **Checks for duplicates** and links or closes the issue as a duplicate
   when one is found, pointing to the original.
4. **Requests missing information** when the report lacks reproduction
   steps, environment details, or a clear description, and labels it as
   awaiting a response from the reporter.
5. **Labels difficulty/scope** where applicable (e.g. `good-first-issue`),
   per `Governance/MENTORSHIP.md`.
6. **Assigns or leaves unassigned** — issues ready for contribution are left
   unassigned unless a maintainer is actively working on them, so
   contributors can claim them per the project's claiming process.

## Stale or inactive issues

Issues awaiting reporter information with no response are handled per
`Governance/STALE_POLICY.md` (or equivalent) rather than left open
indefinitely.

## Escalation

An issue that reveals a security vulnerability is immediately re-labeled and
routed per the project's security disclosure process rather than left in the
normal triage queue.
