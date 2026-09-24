# Security Disclosure Report

> Use this template when reporting a security vulnerability to StellarEarn.
> **Do not create or publish a public GitHub issue for security issues.**
> The private reporting channels and the expected response times are defined
> in the repository's `SECURITY.md`.

## Private channel

Send this report through one of the private channels in `SECURITY.md`:

- GitHub **Private Vulnerability Reporting** (`Security -> Report a
  vulnerability` tab) - preferred; or
- email to the security address listed in `SECURITY.md`.

Do not include this report in any public issue, PR, or comment.

## Report

| Field             | Required | What to include                                                       |
| ----------------- | -------- | --------------------------------------------------------------------- |
| Reporter          | Yes      | Handle and a way to reach you (keep optional if you prefer anonymity) |
| Component         | Yes      | contracts/earn-quest, BackEnd, FrontEnd, subgraph, or CI/deployment   |
| Version or commit | Yes      | The exact version or ref the issue reproduces on                      |
| Network           | Yes      | local, testnet, or mainnet                                            |
| Impact            | Yes      | What an attacker can do; severity rating if known                     |
| Reproduction      | Yes      | Steps to reproduce or a proof of concept                              |
| Remediation       | No       | Suggested fix, if you have one                                        |

## Summary

<One or two sentences describing the vulnerability and its worst-case impact.>

## Impact

<What an attacker can do: read or modify data, drain escrowed funds, escalate
privileges, or deny service. For the smart contract, remember that it handles
user funds via escrow and payouts, so treat value-at-risk explicitly.>

## Reproduction

<Step-by-step steps to reproduce, or a proof of concept. Include the version
or commit, the network (local / testnet / mainnet), and any special account
state required.>

## Suggested remediation

<Optional. A fix direction, affected code location, or mitigating control
that would close or reduce the issue.>

## Confidentiality note

The maintainers acknowledge within the window stated in `SECURITY.md`, then
agree a fix timeline and disclosure date with you before any public
disclosure. Credit is given on request.