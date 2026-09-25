# Bounty Funding, Payout, and Dispute Governance

This policy establishes the governance standards for creating, funding, verifying, paying out, and resolving disputes for bounties in StellarEarn.

## 1. Scope and Objectives

This policy governs all community bounties, micro-grants, and program rewards associated with the StellarEarn repository and ecosystem. The primary objectives are:

- Ensure transparent and verifiable allocation of funds before work begins.
- Enforce strict acceptance standards for code contributions and documentation.
- Guarantee prompt disbursal of approved rewards to contributors.
- Provide a fair, structured, and auditable procedure for dispute resolution.

## 2. Funding Sources and Escrow Verification

Bounties must be backed by verifiable assets before being marked open for contributor assignment.

| Source | Description | Escrow Verification Requirement |
| --- | --- | --- |
| Ecosystem Grants | Grants awarded to the project (e.g., Stellar Community Fund, Wave programs). | Verified deposit in project multi-sig or designated program escrow smart contract. |
| Treasury Allocations | General project operational funds allocated by maintainers. | Dedicated on-chain allocation record or confirmed automated platform escrow. |
| Third-Party Sponsorships | External organizations sponsoring specific issues or features. | Funds locked in third-party escrow or platform partner balance prior to posting. |

### Escrow Requirements
1. **Pre-Allocation Lock**: Bounties must not be advertised as funded until the required funds are confirmed locked in escrow or in the treasury wallet.
2. **Denomination**: Bounty amounts must state the exact currency or token denomination (e.g., XLM, USDC, native reward points) and equivalent target USD valuation at creation.
3. **Escrow Invalidation**: If an escrow allocation fails or is cancelled, maintainers must update the issue state to `status:blocked` immediately and notify contributors.

## 3. Contributor Assignment and Eligibility

To prevent duplicate effort and ensure accountability, contributors must follow the structured assignment process:

1. **Application**: Contributors apply by commenting on the issue with an implementation proposal and estimated completion date.
2. **Single Assignee**: Maintainers assign a single contributor (or designated team) using GitHub assignment. Multiple uncoordinated assignees are prohibited.
3. **Time-to-Delivery (TTD)**: Each bounty carries an explicit delivery deadline (typically 7 to 14 calendar days). If no progress or pull request is provided by the deadline, maintainers may unassign the contributor and return the issue to `status:ready`.

## 4. Verification and Payout Criteria

A bounty is approved for payout only when all of the following technical and operational criteria are satisfied:

| Step | Requirement | Responsible Party |
| --- | --- | --- |
| 1. Pull Request Submission | Pull request linked to the target issue (`Fixes #<id>`), drafted against the target branch. | Contributor |
| 2. Automated CI Validation | All continuous integration checks pass without errors or bypasses (lint, build, unit tests, integration tests). | Automated CI |
| 3. Code Quality & Standards | Scope confined to issue boundaries. No unauthorized refactoring or mocked assertions. | Maintainers / Reviewers |
| 4. Formal Review Approval | Minimum of one approving review from a recognized maintainer with write access. | Project Maintainer |
| 5. Pull Request Merge | Pull request successfully merged into the target repository branch. | Project Maintainer |

### Payout Execution
- **Disbursal Window**: Payouts must be initiated within five (5) business days following pull request merge.
- **Routing**: Payments are disbursed directly to the contributor's designated public wallet address (e.g., Stellar account or EVM address as defined by the bounty terms).
- **Payment Record**: The transaction hash, transfer receipt, or platform claim confirmation must be logged or linked in the issue thread upon payment execution.

## 5. Dispute Handling and Resolution

When disagreements occur regarding bounty assignment, scope acceptance, or payout fulfillment, contributors and maintainers must resolve them through this process.

```text
Issue Raised -> Informal Discussion (48h) -> Formal Dispute Submission -> Maintainer Review (5 business days) -> Final TSC Determination
```

### Grounds for Dispute
- **Assignment Contestation**: Contributor was unassigned while actively progressing within the agreed deadline.
- **Review Rejection**: Disagreement on whether the submitted pull request meets the documented acceptance criteria.
- **Unpaid Approved Bounty**: Pull request was merged, but payout was not disbursed within five business days.
- **Competing Submissions**: Multiple contributors submitted implementations before formal assignment.

### Resolution Steps
1. **Informal Alignment (48 Hours)**: The contributor and reviewing maintainer discuss the disagreement in the pull request or issue comments to reach consensus.
2. **Formal Escalation**: If informal discussion fails, the contributor files a formal dispute by submitting an RFC or contacting the Technical Steering Committee (TSC) or lead maintainers with:
   - Target issue and pull request URLs.
   - Summary of the claim and specific acceptance criteria fulfilled.
   - Relevant commit hashes and timestamp evidence.
3. **TSC Review**: The TSC or an uninvolved neutral maintainer conducts an independent review within five (5) business days.
4. **Final Determination**: The TSC issues a binding written determination:
   - **Full Approval**: Authorize full payout and proceed with disbursal.
   - **Partial Payout / Split Award**: In cases of shared contributions or partial acceptance, award proportional compensation.
   - **Rejection**: Uphold rejection with documented technical rationale.
