# Governance

This folder holds the project's **governance documentation** for StellarEarn â€” how
decisions are made, who is responsible for what, and the policies that keep the
project healthy, secure, and sustainable.

It is intentionally kept separate from the codebase: nothing here changes
application behaviour. Each document below is added and refined through small,
independently-reviewable pull requests (tracked as governance issues), and every
governance change is limited to files inside this `Governance/` folder.

## Structure

- **Charter & principles** â€” mission, scope, guiding values, and how this
  governance itself is amended.
- **Security disclosure template** - [templates/DISCLOSURE_TEMPLATE.md](templates/DISCLOSURE_TEMPLATE.md)
  is the private form for reporting a security vulnerability.
- **Roles** â€” maintainers, reviewers, triagers, security team, release managers,
  and how people move between them.
- **Decision-making** â€” consensus, voting, quorum, RFCs, tie-breaking, and how
  decisions are recorded.
- **Contribution & review** â€” review policy, approvals, triage, merge and commit
  policies, and the contribution ladder.
- **Community** â€” Code of Conduct, enforcement, communication norms, and safety.
- **Technical policies** â€” release/versioning, deprecation, dependencies, CI/CD,
  testing, contract-upgrade governance, and audits.
- **Security & compliance** â€” disclosure, incident response, secrets, access
  control, and data governance.
- **Finance** â€” treasury, grants, sponsorship, and transparency reporting.
- **Records & templates** â€” decision logs, meeting minutes, ADRs, and reusable
  templates.

## How to contribute to governance

1. Pick a governance issue (each is scoped to at most two files in this folder).
2. Add or update the relevant `Governance/*.md` document.
3. Link the document from this index.
4. Open a small PR; governance changes are ratified per the decision-making
   process documented here.

> Status: this folder is being populated document-by-document. Individual
> documents are tracked as governance issues; this index is updated as each one
> lands.
