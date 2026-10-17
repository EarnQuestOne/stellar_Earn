# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in StellarEarn — in the smart contract
(`contracts/earn-quest`), the backend, the frontend, or the CI/deployment
pipeline — report it privately using one of:

- **GitHub Private Vulnerability Reporting**: use the repository's
  **Security → Report a vulnerability** tab (preferred).
- **Email**: security@earnquest.one *(maintainers: replace with a monitored
  address before publishing).*

Please include:

- A description of the issue and its impact (what an attacker can do).
- Steps to reproduce or a proof of concept.
- Affected component(s), version/commit, and network (local / testnet / mainnet).
- Any suggested remediation.

## What to Expect

- **Acknowledgement** within 3 business days.
- A triage assessment and severity rating within 7 business days.
- Coordinated disclosure: we will agree on a fix timeline and a disclosure date
  with you, and credit you (if desired) once a fix is released.

Please give us a reasonable window to remediate before any public disclosure.

## Scope

In scope: the smart contract, the backend API, the web client, and the
build/deploy configuration in this repository.

Out of scope: vulnerabilities in third-party dependencies (report those upstream),
issues requiring a compromised user device, and best-practice suggestions without
a concrete exploit (open a normal issue for those).

## Handling Secrets

- Never commit secrets, private keys, or `.env` files. `secret-scan` runs in CI,
  but treat it as a backstop, not a guarantee.
- If a secret is committed, treat it as compromised: rotate it immediately and
  scrub it from history.

## Smart Contract Note

The on-chain contract handles user funds via escrow and payouts. Until a
completed **third-party audit** is published, deployments should be treated as
pre-audit: prefer testnet, and cap value at risk on mainnet accordingly.
