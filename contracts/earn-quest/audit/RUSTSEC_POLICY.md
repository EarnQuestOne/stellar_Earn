# RustSec Severity Policy

This document describes the project policy for handling RustSec security
advisories in the `earn-quest` Soroban smart-contract crate.

The machine-enforceable rules are in `contracts/earn-quest/deny.toml`.
This document provides the governance context, process, and exception criteria
that sit behind those rules.

---

## Severity Levels and Default Actions

| Severity | `cargo-deny` action | Notes |
|----------|--------------------|-------------------------------------------------|
| Critical | **deny** (CI fail) | Must be resolved before merge |
| High | **deny** (CI fail) | Must be resolved before merge |
| Medium | **deny** (CI fail) | Must be resolved or formally excepted |
| Low | warn (CI passes) | Should be resolved within 30 days |
| Unmaintained | warn | Schedule replacement; track in backlog |
| Yanked | warn | Upgrade at next dependency refresh |
| Notice | warn | Informational; no action required |

`severity-threshold = "medium"` in `deny.toml` means only medium, high, and
critical advisories are subject to the `vulnerability = "deny"` rule.

---

## Remediation Workflow

1. **Detection** — `cargo audit` and `cargo deny check advisories` run on every
   PR and on a weekly schedule (`.github/workflows/dependency-audit.yml`).

2. **Triage** — When a new advisory appears, the assignee must:
   - Determine whether the vulnerable code path is reachable in this project.
   - Identify whether a patched version of the dependency is available.

3. **Remediation** (preferred) — Update `Cargo.toml` to use a patched version
   and remove any related exception entry.

4. **Exception** (when remediation is not immediately possible) — Add an entry
   to the `ignore` list in `deny.toml` following the format below.

---

## Exception Format

Every exception entry in the `ignore` list **must** be accompanied by a comment
block directly above it:

```toml
ignore = [
    "RUSTSEC-YYYY-NNNN",
    # ^ <crate-name>: <one-line description of the advisory>
    #   Impact assessment: <why this specific project is not affected, or
    #                        what mitigations are in place>
    #   Affected versions: <version range>
    #   Our version: <what we currently pin>
    #   Remediation plan: <upstream issue/PR link or "no fix available">
    #   Re-evaluate by: YYYY-MM-DD (max 90 days from date added)
    #   Approved by: <GitHub handle of reviewer>
]
```

Exceptions without a complete comment block will be rejected in code review.

---

## Quarterly Security Review

All active exceptions must be reviewed every 90 days:

- Confirm the advisory is still unresolved upstream.
- Confirm the impact assessment is still accurate.
- Update the re-evaluation date or remove the exception if resolved.
- Document the review outcome as a PR updating this file or `deny.toml`.

---

## Adding a New Exception — Checklist

- [ ] `cargo audit` output confirms the advisory ID and severity
- [ ] Verified the vulnerable code path is not reachable (or mitigated)
- [ ] No patched version of the dependency is available
- [ ] Exception entry in `deny.toml` follows the format above
- [ ] Re-evaluation date set (≤ 90 days)
- [ ] Reviewed and approved by a second team member

---

## References

- [RustSec Advisory Database](https://rustsec.org/)
- [cargo-audit](https://github.com/rustsec/rustsec/tree/main/cargo-audit)
- [cargo-deny advisories config](https://embarkstudios.github.io/cargo-deny/checks/advisories/cfg.html)
- `contracts/earn-quest/deny.toml` — machine-enforceable policy
- `contracts/earn-quest/audit/SECURITY.md` — broader security documentation