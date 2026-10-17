# Inclusive Language Guideline

This document describes the inclusive-language standards for StellarEarn across
code, documentation, commit messages, issue comments, and community spaces.
The goal is a codebase and community where every contributor feels welcomed and
respected.

## Why this matters

Language shapes culture. Terminology that was once common in software
development can exclude or demean people based on race, gender, disability, or
other characteristics. Replacing such terms costs little effort and signals
that the project values all contributors equally.

## Scope

This guideline applies to:

- Source code (variable names, function names, comments, string literals).
- Documentation (README files, governance docs, API references, changelogs).
- Commit messages, branch names, and pull request titles and descriptions.
- Issue tracker content authored by maintainers and triagers.
- Communication channels listed in [COMMUNICATION.md](COMMUNICATION.md).

Contributors are encouraged to apply this guideline to their own writing.
Reviewers may request changes when a PR introduces non-inclusive terminology,
treating such requests the same as any other code-quality comment.

## Preferred terms

Use the preferred term in the left column; avoid the term in the right column.

| Preferred | Avoid | Notes |
|-----------|-------|-------|
| `primary` / `main` | `master` | Branch names, database roles, device roles. |
| `secondary` / `replica` | `slave` | Database replication, device bus roles. |
| `allowlist` | `whitelist` | Access control, firewall rules. |
| `denylist` / `blocklist` | `blacklist` | Access control, firewall rules. |
| `placeholder` / `example value` | `dummy` | Test data, stub values. |
| `mock` / `stub` / `fake` | `dummy` (as a noun for test doubles) | Use precise test-double terminology. |
| `sanity check` → `confidence check` / `quick check` | `sanity check` | Code review and testing language. |
| `kill` → `stop` / `terminate` / `cancel` | `kill` (where a neutral term works) | Process management, signal names are excepted. |
| `hang` → `block` / `stall` / `freeze` | `hang` (where ambiguous) | Describing blocked processes. |
| `native` → `built-in` / `core` | `native` (when meaning "built-in") | Avoid conflating with indigenous peoples. |
| `guys` → `folks` / `team` / `everyone` | `guys` (as a gender-neutral address) | Community communication. |
| `man-hours` → `person-hours` / `engineer-hours` | `man-hours` | Effort estimation. |
| `man-in-the-middle` → `on-path attack` / `interceptor` | `man-in-the-middle` (in new writing) | Security terminology; existing protocol names are excepted. |

This list is not exhaustive. When in doubt, choose the clearest, most neutral
term available.

## Exceptions

Some terms cannot be changed without breaking compatibility:

- **Protocol and standard names** defined by external bodies
  (e.g. SSL/TLS "master secret", MIDI "master/slave clock").
- **Operating system or hardware interfaces** that use fixed terminology
  (e.g. Linux kernel signal names).
- **Quoted third-party content** reproduced verbatim for accuracy.

Exceptions must be noted with a brief inline comment where practical.

## Adding or updating terms

Propose additions or changes to the preferred-terms table by opening a
governance issue scoped to this file and `README.md`. Include the rationale
and any relevant references. The change is ratified through the standard
governance pull-request process.

## Enforcement

Inclusive-language feedback is given respectfully and constructively, the same
as any other review comment. Reviewers should link to this document when
requesting a change. Repeated or deliberate use of excluded terms after
feedback may be treated as a community-standards issue under the Code of
Conduct (see [COC_REPORTING.md](COC_REPORTING.md)).

## Related documents

- [COMMUNICATION.md](COMMUNICATION.md) – project communication channels and norms.
- [COC_REPORTING.md](COC_REPORTING.md) – Code of Conduct incident reporting.
- [SAFETY_POLICY.md](SAFETY_POLICY.md) – anti-harassment and contributor safety.
