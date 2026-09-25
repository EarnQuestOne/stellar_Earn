# Bug Bounty Program Governance

This document defines the governance policy, scope, reward structure, eligibility criteria, and safe-harbor terms for the StellarEarn Bug Bounty Program.

The program incentivizes independent security researchers to inspect StellarEarn codebases, report vulnerabilities responsibly, and safeguard community assets.

## Scope

### In-Scope Assets

The bug bounty program covers production code and core infrastructure within this repository:

| Asset | Target Path / Scope | Description |
| --- | --- | --- |
| Soroban Smart Contracts | `contracts/earn-quest` | Core escrow, quest validation, payout distribution, and access controls |
| Backend Application API | `BackEnd/` | API routing, state management, transaction dispatching, and database interfaces |
| Frontend Web Client | `FrontEnd/` | Client-side wallet integration, signing flows, and interface state handling |
| Indexer & Subgraph | `subgraph/` | Event indexing, data pipelines, and graph query integrity |

### Out-of-Scope Assets and Issues

The following areas are excluded from reward eligibility:

1. **Third-Party Dependencies:** Vulnerabilities originating exclusively in upstream dependencies (e.g., Soroban SDK, Next.js, Node.js packages) unless a direct, exploitable impact on StellarEarn is demonstrated.
2. **Denial of Service (DoS/DDoS):** Attacks that flood network bandwidth, disrupt RPC nodes, or exhaust rate limits without exploiting business logic flaws.
3. **Social Engineering & Phishing:** Attacks directed at StellarEarn maintainers, contributors, or users (e.g., credential theft, phishing campaigns).
4. **Physical & Device Attacks:** Attacks requiring physical access to a user's device or local malware already running on the client machine.
5. **Automated Tool Output:** Raw, unverified output from automated scanners or static analysis tools without an accompanying functional proof-of-concept.
6. **Theoretical Issues:** Best-practice deviations, missing HTTP headers, or theoretical issues without demonstrable vulnerability.
7. **Known Issues:** Bugs already tracked in public GitHub issues, prior disclosure reports, or ongoing pull requests.

## Severity Classification and Rewards

Rewards are determined by the StellarEarn Technical Steering Committee (TSC) based on severity, exploitability, and potential impact. Reward amounts are denominated in USD value and disbursed in XLM or USDC to the reporter's verified Stellar address.

| Severity | Impact Definition | Typical Bounty Range |
| --- | --- | --- |
| **Critical** | Direct, unauthorized theft or permanent locking of escrowed funds; unauthorized modification of core contract state; arbitrary code execution on backend servers. | $2,500 – $10,000 |
| **High** | Temporary disruption of escrow payouts; bypass of authorization controls without immediate fund loss; state corruption requiring hardfork or contract upgrade. | $1,000 – $2,500 |
| **Medium** | Unauthorized modification of quest metadata; unintended leaking of sensitive user operational data; griefing attacks with measurable financial or state cost. | $250 – $1,000 |
| **Low** | Minor informational leaks; non-exploitable logic edge cases; minor access-control inconsistencies that do not compromise user balances or system state. | $50 – $250 |

Maintainers retain discretion to adjust reward amounts based on report quality, thoroughness of the reproduction steps, and clarity of the remediation plan.

## Eligibility Criteria

To be eligible for a bounty reward, reporters must meet the following criteria:

1. **First-to-Report:** The vulnerability must be original and reported first. Duplicate reports will not receive rewards.
2. **Independence:** Reporters cannot be core maintainers, active employees, or contractors of StellarEarn who authored or reviewed the vulnerable code.
3. **Legal Compliance:** Reporters must not be subject to trade sanctions or reside in jurisdictions prohibited by applicable laws and regulations.
4. **Adherence to Disclosure:** Reports must be submitted exclusively through authorized private channels. Any public disclosure before authorized release forfeits eligibility.
5. **Non-Destructive Testing:** Testing must avoid real economic damage, state destruction, privacy invasion, or prolonged service outages.

## Safe Harbor and Legal Protection

StellarEarn considers security research conducted within this policy to be authorized, good-faith security research.

### Commitments to Researchers

If a researcher complies with this policy during their investigation and reporting:

- **No Legal Action:** StellarEarn will not initiate civil lawsuits or legal complaints for unauthorized computer access under the Computer Fraud and Abuse Act (CFAA) or DMCA anti-circumvention provisions.
- **Law Enforcement:** If legal action is initiated by a third party against a researcher acting in good faith, StellarEarn will confirm that the researcher acted in accordance with this policy.
- **Explicit Authorization:** Testing within the defined scope is considered authorized conduct.

### Safe Research Rules of Engagement

Researchers must abide by the following constraints:

- Use designated testnet environments or local Soroban sandboxes whenever testing state transitions or exploits.
- Do not exploit a vulnerability beyond the minimum required to prove impact (e.g., execute a test transfer rather than draining an entire pool).
- Never view, store, or exfiltrate customer personal data or private keys. If sensitive data is encountered, stop immediately and submit the report.
- Do not conduct attacks against third-party validators, external RPC providers, or Stellar network infrastructure.

## Submission and Coordinated Disclosure Process

### Reporting Channels

Security reports must be submitted privately via one of two channels:

1. **GitHub Private Vulnerability Reporting:** Submit directly via the repository's `Security -> Report a vulnerability` tab using the format provided in `Governance/templates/DISCLOSURE_TEMPLATE.md`.
2. **Email Disclosure:** Send reports to the security contact designated in `SECURITY.md`.

**Never open public GitHub issues or submit pull requests containing unresolved security vulnerability details.**

### Response Timeline and SLAs

| Milestone | Target SLA | Action |
| --- | --- | --- |
| **Initial Acknowledgment** | Within 3 business days | Maintainers acknowledge receipt and assign a triage lead. |
| **Triage & Validation** | Within 7 business days | The security team validates the reproduction steps and assigns a severity rating. |
| **Remediation & Patch** | Within 30 business days | A private fix is implemented, audited, and tested. |
| **Public Disclosure & Payout** | Within 14 days of patch | Reward is distributed, credit is published, and coordinated disclosure is released. |

### Coordinated Public Disclosure

Public disclosure must be coordinated between the researcher and StellarEarn maintainers. Once a fix is verified and deployed to production, maintainers and the reporter will agree on a public disclosure date and release notes.

## Decision Making and Dispute Resolution

All bounty reward determinations, severity ratings, and scope decisions are governed by the maintainers in consultation with the Technical Steering Committee per `Governance/README.md`.

In the event of a dispute regarding severity or originality:
1. The reporter may submit additional technical evidence or proof of impact.
2. An independent maintainer who was not involved in the initial evaluation will conduct a secondary review.
3. The secondary determination is final.
