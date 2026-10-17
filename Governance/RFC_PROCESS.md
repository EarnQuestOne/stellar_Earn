# Request for Comments (RFC) Process

## Purpose

The Request for Comments (RFC) process provides a structured, collaborative mechanism for proposing substantial technical, architectural, or governance changes to the StellarEarn project. It ensures that major decisions receive thorough peer review, design evaluation, and public community input before implementation begins.

## When an RFC is Required

An RFC is required for major project changes, including but not limited to:

- Major architectural modifications or new core subsystem additions.
- Breaking changes to public APIs, smart contract interfaces, or database schemas.
- Introduction of new core dependencies or major framework migrations.
- Significant changes to security models, consensus logic, or financial/grant mechanics.
- Substantial modifications to project governance, maintainer workflows, or policies.

*Minor bug fixes, performance optimizations, documentation updates, and small non-breaking feature additions do not require an RFC and should proceed directly through standard pull requests.*

## Reference Template

All proposals must use the official RFC template located at:
[`Governance/templates/RFC_TEMPLATE.md`](templates/RFC_TEMPLATE.md)

Authors must copy this template and complete all required metadata, problem description, proposed design, trade-offs, and unresolved questions.

## RFC Lifecycle and Stages

RFCs progress through six formal stages:

```
[ Draft ] ---> [ Proposed (PR) ] ---> [ Final Comment Period ] ---> [ Accepted ]
                      |                       |                         |
                      v                       v                         v
                 [ Withdrawn ]           [ Rejected ]            [ Superseded ]
```

| Stage | Description & Actions |
| :--- | :--- |
| **1. Draft** | The author writes the RFC locally or in a personal branch using [`templates/RFC_TEMPLATE.md`](templates/RFC_TEMPLATE.md). The status is set to `Draft`. |
| **2. Proposed** | The author opens a PR against the `Governance/` directory containing the RFC file. The PR title must follow `RFC: <title>`. The status in the document is updated to `Proposed`. |
| **3. Review & Discussion** | A minimum **14 calendar day** public comment period begins. Maintainers, contributors, and community members review the PR, request clarifications, and suggest modifications inline. The author updates the PR with improvements. |
| **4. Final Comment Period (FCP)** | Once major discussions converge, a Maintainer announces the Final Comment Period (FCP). The FCP lasts **7 calendar days**. During FCP, the community receives a final window to raise critical objections. |
| **5. Decision** | At the conclusion of FCP, maintainers decide on the RFC per [VOTING.md](VOTING.md):<br>- **Accepted:** The RFC PR is merged, status set to `Accepted`. Implementation issue(s) are created.<br>- **Rejected:** The RFC PR is closed with detailed technical reasons logged in the RFC and PR comment. Status set to `Rejected`.<br>- **Withdrawn:** The author closes the PR prior to decision. Status set to `Withdrawn`. |
| **6. Superseded / Retired** | If a previously `Accepted` RFC is replaced by a newer accepted proposal, its status is updated to `Superseded` with a direct link to the new RFC. |

## Implementation and Tracking

- Once an RFC is **Accepted**, trackable implementation issues are opened and tagged with `rfc-implementation`.
- Pull requests implementing an accepted RFC must link back to the RFC file.
- Substantial deviations during implementation from the accepted design require an update PR to the RFC document.
