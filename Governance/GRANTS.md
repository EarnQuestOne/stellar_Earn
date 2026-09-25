# Grant Application and Disbursement Process

This document defines how contributors and external applicants can request grants from the StellarEarn treasury, how applications are evaluated, and how approved grants are disbursed in milestone-based payments.

## Eligibility

- Open to any individual or team whose proposed work advances StellarEarn's mission.
- Applicants must not have an unresolved Code of Conduct violation.
- Current maintainers may apply but must recuse themselves from review and approval.

## Application Requirements

Each application must include:

1. **Project description**: What will be built, why it matters, and how it aligns with project goals.
2. **Deliverables**: Concrete, measurable outcomes (code, documentation, research, design, etc.).
3. **Milestones**: A timeline with 2–4 milestones, each with a clear acceptance criterion and a requested payout amount.
4. **Budget**: Total amount requested, broken down by milestone. Include a brief justification for each cost category (e.g., developer time, infrastructure, audit).
5. **Team**: Names, roles, and relevant experience. Link to prior work or GitHub profiles.
6. **Risks & mitigations**: Technical, legal, or operational risks and how they will be addressed.
7. **License**: Confirmation that all output will be licensed under the project's standard license (Apache-2.0 for code, CC-BY-4.0 for docs).

Applications are submitted as a GitHub issue using the grant application template (to be created) or via the project's designated intake form.

## Review Process

1. **Intake**: A maintainer with treasury authority confirms the application is complete within 5 business days. Incomplete applications are returned with feedback.
2. **Public comment period**: The application is open for community comments for 10 business days.
3. **Evaluation**: A review panel of at least 2 maintainers (excluding any with conflicts of interest) scores the application on:
   - Mission alignment (0–10)
   - Feasibility and technical merit (0–10)
   - Team capability (0–10)
   - Budget reasonableness (0–10)
   - Risk awareness (0–5)
4. **Decision**: The panel recommends **Approve**, **Approve with modifications**, or **Decline**. A simple majority of the panel approves. The decision and rationale are recorded on the application issue.
5. **Agreement**: Approved applicants sign a grant agreement confirming deliverables, milestones, reporting obligations, and IP/license terms.

## Milestone-Based Disbursement

- Funds are released **per milestone**, not upfront.
- For each milestone, the applicant submits:
  - Completed deliverables (PR links, deployed artifacts, documents, etc.)
  - A brief completion report
  - An invoice or payment request
- A designated maintainer verifies the deliverables against the acceptance criteria within 5 business days.
- On verification, the milestone amount is paid via the project's standard payout method.
- If deliverables are incomplete or don't meet criteria, the maintainer provides feedback and a 10-business-day remediation window. If unresolved, the milestone is not paid and the grant may be terminated.

## Reporting & Transparency

- Grant recipients publish a brief update at each milestone (can be a comment on the application issue).
- All grants (approved, declined, terminated) are listed in the project's financial transparency reports (see `docs/governance/FINANCIAL_TRANSPARENCY.md`).
- The grant register records: applicant, amount, milestones, status, and links to deliverables.

## Termination

The project may terminate a grant if:
- The recipient fails to meet a milestone after the remediation window.
- The recipient violates the Code of Conduct or grant agreement.
- The project's financial situation materially changes (with 30 days' notice).

Termination decisions are made by maintainers with treasury authority and documented on the grant issue. Paid milestones are not clawed back; unpaid milestones are forfeited.

## Scope

This process covers all treasury-funded grants: development, research, design, community, education, and infrastructure. Sponsorships are governed by `SPONSORSHIP.md`. Expense reimbursements are governed by `EXPENSES.md`.