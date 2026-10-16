# Contract Disclosure and Embargo Policy

Contract vulnerabilities can put user funds at risk before a fix can be deployed. This policy describes how reports are embargoed and when details become public.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every 6 months and after any embargoed disclosure
- **Status:** Active

## Reporting

Vulnerabilities are reported privately using templates/DISCLOSURE_TEMPLATE.md and SECURITY.md. Reports are never filed as public issues or discussed in public channels.

## Embargo

From acknowledgement, the report is embargoed. Only the security team and the maintainers needed to fix it may know details. Default embargo is 90 days, shortened once a fix is deployed and users have had time to upgrade, and extended only with the reporter's agreement.

## Coordinated release

The fix is prepared privately, reviewed, and deployed together with any required migration. A public advisory follows deployment and includes affected versions, impact, fix version, and credit if the reporter wishes.

## Early notice

Integrators or auditors may be told under embargo only when their action is needed to protect funds, and only the minimum necessary.

## Ownership and review

Owned by the security team. Reviewed every six months and after each embargoed disclosure.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
