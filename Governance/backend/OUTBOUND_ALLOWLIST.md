# Backend Outbound-Request Allowlist Policy

Unrestricted outbound requests enable data exfiltration and SSRF. This policy limits backend services to approved external hosts.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Default deny

Backend services may call only hosts on the allowlist. User-supplied URLs are never fetched directly; if a feature requires it, it goes through a restricted fetcher.

## Adding a host

Request via a pull request that names the host, purpose, data sent, owner, and authentication method. Approval from a backend maintainer, plus the security team for hosts receiving sensitive data.

## Technical controls

Enforce the allowlist in code or at the network layer; resolve and check the IP to block private, loopback, and metadata ranges; require HTTPS; set timeouts and size limits.

## Review

Hosts are reviewed every six months and removed when unused. Owned by the backend maintainers.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
