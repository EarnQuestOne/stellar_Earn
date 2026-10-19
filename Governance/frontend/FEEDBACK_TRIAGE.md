# Frontend User-Feedback Triage Process

This process defines how user feedback about the StellarEarn frontend is
collected, labelled, routed, and resolved. It covers in-app feedback, support
conversations, GitHub issues, community channels, accessibility reports, and
feedback received during beta programs.

- **Owner:** Frontend maintainers, with support and community leads as co-owners
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Issue lifecycle](../ISSUE_LIFECYCLE.md), [Triage policy](../TRIAGE_POLICY.md), [Communication](../COMMUNICATION.md), [PR guidelines](../PR_GUIDELINES.md)

## Collection

- The in-app feedback form captures the page or route, a description, an
  optional screenshot, the application version, and the browser. It does not
  capture free-text personal data automatically.
- Reports from support and community channels are copied into the issue tracker
  with the reporter's consent and without unnecessary personal details.
- Security reports are never triaged in public. Redirect them to the private
  disclosure process in [DISCLOSURE_TEMPLATE.md](../templates/DISCLOSURE_TEMPLATE.md)
  immediately.
- Duplicate reports are linked to the original instead of being closed without
  explanation.

## Labelling

Every triaged item receives:

- a **type**: `bug`, `enhancement`, `documentation`, `accessibility`,
  `performance`, or `question`;
- an **area**: frontend route, component group, or design-system area;
- a **priority**: `priority:high`, `priority:medium`, or `priority:low`;
- a **status** that reflects whether it is new, accepted, blocked, or declined.

Accessibility reports are additionally labelled `a11y` and are triaged as bugs,
not enhancements, when they prevent task completion.

## Priority and routing

| Priority | Criteria | First response | Routing |
|----------|----------|----------------|---------|
| High | Data loss, security concern, authentication failure, or a broken core flow affecting many users | 1 business day | Frontend on-call and a maintainer |
| Medium | A feature is degraded, a workaround exists, or a significant accessibility barrier is present | 3 business days | Frontend maintainers |
| Low | Cosmetic issue, copy change, or nice-to-have request | 10 business days | Backlog grooming |

Routing assigns one owner. Items that span frontend and backend move to the
owning team with a linked issue rather than being bounced between queues.
Feedback that requires product direction is labelled `needs-product` and raised
at the next product review.

## Lifecycle

1. **Capture:** record the report with its source and context.
2. **Validate:** reproduce the issue or confirm the request is understood.
3. **Classify:** apply type, area, and priority labels and check for duplicates.
4. **Route:** assign an owner and, for accepted work, an issue in the roadmap.
5. **Resolve:** link the pull request that addresses the item and verify the fix
   with the reporter where possible.
6. **Close:** explain the outcome. Declined items state the reason and whether
   they can be revisited.

Items with no response from the reporter after two follow-ups may be closed as
incomplete, with a note that they can be reopened.

## Privacy and conduct

- Collect only what is needed to understand the report.
- Remove screenshots or logs that contain tokens, wallet secrets, or personal
  data before attaching them to a public issue.
- Feedback is handled under the [Code of Conduct](../CODE_OF_CONDUCT.md). Abusive
  reports are moderated, not ignored.

## Metrics and review

The team tracks time to first response, time to triage, reopened rate, and the
proportion of accessibility reports resolved within their priority target.
These metrics are reviewed monthly. Recurring themes are fed into product
planning and, where relevant, into beta-program decisions.

## Ownership and review

The frontend maintainers own this process; support and community leads own their
collection channels. The process is reviewed every six months and whenever the
issue tracker or feedback tooling changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
