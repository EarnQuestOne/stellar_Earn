# Governance

This folder holds the project's **governance documentation** for StellarEarn — how
decisions are made, who is responsible for what, and the policies that keep the
project healthy, secure, and sustainable.

It is intentionally kept separate from the codebase: nothing here changes
application behaviour. Each document below is added and refined through small,
independently-reviewable pull requests (tracked as governance issues), and every
governance change is limited to files inside this `Governance/` folder.

## Structure

- **Charter & principles** — mission, scope, guiding values, and how this
  governance itself is amended.
- **Security disclosure template** - [templates/DISCLOSURE_TEMPLATE.md](templates/DISCLOSURE_TEMPLATE.md)
  is the private form for reporting a security vulnerability.
- **Working groups and SIGs** - [WORKING_GROUPS.md](WORKING_GROUPS.md)
  defines how groups are formed, report to the TSC, and dissolve.
- **Postmortem template** - [templates/POSTMORTEM_TEMPLATE.md](templates/POSTMORTEM_TEMPLATE.md)
  is the blameless template for writing incident postmortems.
- **RFC template** - [templates/RFC_TEMPLATE.md](templates/RFC_TEMPLATE.md) is
  the reusable template for writing RFC proposals, with a status field.
- **Subproject acceptance** - [SUBPROJECT_ACCEPTANCE.md](SUBPROJECT_ACCEPTANCE.md)
  defines how new subprojects are proposed, incubated, and accepted.
- **Maintainers roster** - [MAINTAINERS.md](MAINTAINERS.md) lists current
  maintainers, their areas, and how the roster is updated.
- **Maintainer offboarding** - [OFFBOARDING.md](OFFBOARDING.md) defines how a
  maintainer steps down or is removed, access revocation, and emeritus status.
- **Roles** — maintainers, reviewers, triagers, security team, release managers,
  and how people move between them.
- **Decision-making** — [DECISION_MAKING.md](DECISION_MAKING.md): lazy
  consensus, escalation, and what triggers a formal vote; see also
  [VOTING.md](VOTING.md), quorum, RFCs, tie-breaking, and how decisions are
  recorded.
- **Contribution & review** — review policy, approvals, triage, merge and commit
  policies, and the contribution ladder:
  [CONTRIBUTION_LADDER.md](CONTRIBUTION_LADDER.md) names the rungs from
  contributor to maintainer, the criteria for each, and the evidence a
  promotion must show.
- **Community** — Code of Conduct, enforcement, communication norms, and safety.
- **Technical policies** — release/versioning, deprecation, dependencies, CI/CD,
  testing, contract-upgrade governance, and audits.
- **Security & compliance** — disclosure, incident response, secrets, access
  control, and data governance.
- **Finance** — treasury, grants, sponsorship, and transparency reporting.
- **Sponsorship acceptance** — [SPONSORSHIP.md](SPONSORSHIP.md) defines criteria, disclosure, and process for accepting sponsorships.
- **Grant application & disbursement** — [GRANTS.md](GRANTS.md) defines the grant application process, review criteria, and milestone-based disbursement.
- **Records & templates** — decision logs, meeting minutes, ADRs, and reusable
  templates.
- **Architecture Decision Records** - [decisions/README.md](decisions/README.md)
  contains the ADR index and numbering scheme for architectural decisions.
- **Archival Policy** — [ARCHIVE_POLICY.md](ARCHIVE_POLICY.md) defines how superseded
  documents are archived and stored.

## New governance documents

- [Governance FAQ](FAQ.md): quick answers to common governance questions. (Closes #2508)
- [Subproject and module governance](SUBPROJECTS.md): per-area ownership, autonomy, and cross-area rules. (Closes #2507)
- [Security response team](roles/SECURITY_TEAM.md): membership, authority, and confidentiality. (Closes #2517)
- [Roles and responsibilities](ROLES.md): role index plus the responsibility and permission matrices. (Closes #2510)
- [Maintainer role](roles/MAINTAINER.md): duties, rights, and responsiveness expectations for maintainers. (Closes #2511)
- [Reviewer role](roles/REVIEWER.md): review scope and the approvals a reviewer may give. (Closes #2512)
- [Release manager role](roles/RELEASE_MANAGER.md): duties, the authority to cut a release, the rotation, and the emergency path. (Closes #2518)
- [Fork and re-licensing policy](FORK_POLICY.md): how the project may be forked and the approvals a license change needs. (Closes #2509)
- [Project charter](CHARTER.md): purpose, scope, and the authority structure of the project. (Closes #2501)
- [Mission and scope](MISSION.md): the project mission, in-scope work, and explicit non-goals. (Closes #2503)
- [Governance model overview](GOVERNANCE.md): roles, decision-making, and escalation at a glance. (Closes #2502)
- [Governance glossary](GLOSSARY.md): shared definitions of governance terms. (Closes #2504)
- [Amending governance](AMENDMENTS.md): how governance documents are proposed, reviewed, and ratified. (Closes #2505)
- [Guiding principles and values](PRINCIPLES.md): the values that guide governance decisions. (Closes #2506)
- [Contributor role](roles/CONTRIBUTOR.md): what the role entails and the contribution ladder. (Closes #2513)
- [Triager role](roles/TRIAGER.md): triage duties and the label/milestone permissions the role holds. (Closes #2514)
- [Technical steering committee](TSC.md): the TSC's membership, remit, and term. (Closes #2515)
- [Leadership and council model](LEADERSHIP.md): how top-level leadership works and how it is held accountable. (Closes #2516)
- [Issue lifecycle](ISSUE_LIFECYCLE.md): states, transitions, labels, and ownership.
- [Pull request guidelines](PR_GUIDELINES.md): size, scope, and splitting guidance.
- [Maturity checklist](MATURITY_CHECKLIST.md): a scored governance self-audit.
- [Hotfix policy](HOTFIX_POLICY.md): code-freeze and emergency-change controls.
- [Emergency decision powers and constraints](EMERGENCY_POWERS.md): scope, hard limits, and retroactive ratification for urgent out-of-process decisions. (Closes #2527)
- [Inclusive language guideline](INCLUSIVE_LANGUAGE.md): preferred terms, exceptions, and enforcement. (Closes #2556)
- [Semantic versioning policy](VERSIONING.md): MAJOR/MINOR/PATCH rules, pre-release identifiers, and build metadata. (Closes #2559)
- [Deprecation and breaking-change policy](DEPRECATION_POLICY.md): notice periods, migration requirements, and removal process. (Closes #2560)
- [Anti-harassment and safety policy](SAFETY_POLICY.md): prohibited behaviours, reporting, consequences, and support resources. (Closes #2557)
- [Release and versioning policy](RELEASE_POLICY.md): versioning scheme, release types, approval requirements, and rollback. (Closes #2558)
- [Dependency management policy](DEPENDENCY_POLICY.md): vetting, pinning, vulnerability SLAs, and prohibited packages. (Closes #2561)
- [Code of Conduct incident reporting](COC_REPORTING.md): reporting channels, process, confidentiality, and appeals. (Closes #2550)
- [Branching strategy](BRANCHING_STRATEGY.md): branch types, naming conventions, flow, and cleanup rules. (Closes #2562)
- [Code of Conduct](CODE_OF_CONDUCT.md): Contributor Covenant baseline — expected behaviour in project spaces, scope, and enforcement through the CoC Committee. (Closes #2549)
- [Commit message policy](COMMIT_POLICY.md): conventional-commits format, allowed types and scopes, breaking-change signalling, and enforcement. (Closes #2548)
- [Conflict resolution and escalation path](CONFLICT_RESOLUTION.md): escalation ladder, timelines, and resolution procedures. (Closes #2526)
- [Tie-breaking rules](TIE_BREAKING.md): tie-breaker mechanisms, designated authority, and rationale requirements. (Closes #2525)
- [RFC and proposal process](RFC_PROCESS.md): lifecycle stages, review period, and template usage. (Closes #2524)
- [Voting procedure and quorum](VOTING.md): voting duration, quorum thresholds, and majority rules. (Closes #2523)
- [Maintainer offboarding and emeritus process](OFFBOARDING.md): step-down and removal steps, access-revocation checklist, and emeritus status. (Closes #2521)
- [Maintainer onboarding checklist](ONBOARDING_MAINTAINER.md): steps from contributor or reviewer to maintainer, the access grants required, and how the change is recorded. (Closes #2520)
- [Decision-making model](DECISION_MAKING.md): lazy consensus, escalation path, and formal-vote triggers. (Closes #2522)
- [Required approvals per change type](APPROVALS.md): which changes need how many approvals, from whom, and under which policy. (Closes #2535)
- [Community moderator role](roles/MODERATOR.md): moderation duties, the actions a moderator may take alone, and escalation to maintainers and the CoC Committee. (Closes #2519)
- [CI/CD governance and required checks](CICD_POLICY.md): the required status checks, their scope, and who may bypass them. (Closes #2563)
- [Contribution ladder](CONTRIBUTION_LADDER.md): the rungs from contributor to maintainer, the criteria for reaching each one, the evidence a promotion must show, and how to step back down. (Closes #2540)
- [Backend Idempotency and Retry Convention](backend/IDEMPOTENCY.md): Which endpoints require idempotency keys, and the semantics.
- [Backend Webhook Delivery and Signing Policy](backend/WEBHOOK_POLICY.md): Signing, retry, and replay protection for outbound webhooks.
- [Backend Pagination and Filtering Convention](backend/PAGINATION_CONVENTION.md): Pagination style and filter-parameter conventions.
- [Backend Error-Response and Error-Code Standard](backend/ERROR_CODES.md): The error envelope and the stable error-code catalogue.
- [Contract Mainnet Change-Freeze Policy](contract/CHANGE_FREEZE.md): Freeze windows during which no mainnet changes ship.
- [Contract On-Chain Monitoring and Alerting Policy](contract/CHAIN_MONITORING.md): On-chain signals to monitor and alert thresholds.
- [Contract Key-Ceremony and Signing Runbook](contract/KEY_CEREMONY.md): Runbook for generating and using signing keys securely.
- [Contract Post-Deployment Verification Policy](contract/POST_DEPLOY_VERIFY.md): Checks run immediately after a contract deployment.
- [Backend Data-Export and Subject-Rights Request Policy](backend/DATA_EXPORT.md): How data-access and deletion requests are fulfilled.
- [Backend Timezone and Datetime Handling Policy](backend/DATETIME_POLICY.md): UTC storage and formatting conventions across the API.
- [Backend Payload-Size and Request-Limit Policy](backend/PAYLOAD_LIMITS.md): Maximum request sizes and the abuse-prevention response.
- [Backend Bulk-Operation and Batching Policy](backend/BULK_OPERATIONS.md): Batch limits and partial-failure semantics.
- [Backend Outbound-Request Allowlist Policy](backend/OUTBOUND_ALLOWLIST.md): Which external hosts backend services may call, and the approval flow.
- [Contract Emergency Pause and Circuit-Breaker Policy](contract/EMERGENCY_PAUSE.md): Who may pause contracts and under what conditions.
- [Contract Event and Storage Schema Compatibility Policy](contract/SCHEMA_COMPAT.md): Backward-compatibility rules for contract events and storage.
- [Contract Parameter-Change Governance](contract/PARAMETER_CHANGE.md): How on-chain parameters are proposed, approved, and changed.
- [Backend API Documentation and OpenAPI Policy](backend/OPENAPI_POLICY.md): Endpoints must ship with OpenAPI documentation that is validated.
- [Backend Contract-Testing Policy](backend/CONTRACT_TESTING.md): Consumer/provider contract tests between services.
- [Backend Money-Handling Precision Policy](backend/MONEY_PRECISION.md): Numeric types and rounding rules for monetary values.
- [Backend Audit Logging for Sensitive Actions](backend/AUDIT_LOGGING.md): Which backend actions must emit audit logs, and the required fields.
- [Contract Oracle Integration and Trust Policy](contract/ORACLE_TRUST.md): Trust assumptions and validation rules for oracle inputs.
- [Contract Fee and Treasury-Sweep Policy](contract/TREASURY_SWEEP.md): How collected contract fees are swept to the treasury and accounted for.
- [Contract Disclosure and Embargo Policy](contract/DISCLOSURE_EMBARGO.md): Embargo handling for contract vulnerability reports.
- [Contract Deployment Record and Provenance Policy](contract/DEPLOY_PROVENANCE.md): Deployment record and provenance requirements for on-chain contracts.
- [Contract Deployment Approval Policy](contract/DEPLOY_APPROVAL.md): The approvals required before any contract is deployed on-chain.

## How to contribute to governance

1. Pick a governance issue (each is scoped to at most two files in this folder).
2. Add or update the relevant `Governance/*.md` document.
3. Link the document from this index.
4. Open a small PR; governance changes are ratified per the decision-making
   process documented here.

> Status: this folder is being populated document-by-document. Individual
> documents are tracked as governance issues; this index is updated as each one
> lands.