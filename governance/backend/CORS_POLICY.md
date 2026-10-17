# Backend CORS Policy Governance

## Overview
This document defines the official Cross-Origin Resource Sharing (CORS) policy governance for backend services in **EarnQuestOne/stellar_Earn**. Restricting permitted origins and HTTP methods prevents unauthorized cross-domain requests, cross-site request forgery (CSRF), and unauthorized API access across Stellar blockchain endpoints and backend services.

---

## 1. Allowed Origins & Environment Configuration
- **Production Environment**: Only explicitly whitelisted, secure domains (`https://*.stellar-earn.com` or designated partner origins) are permitted. Wildcard origins (`*`) are strictly prohibited in production settings.
- **Staging & Development**: Local development origins (e.g., `http://localhost:3000`, `http://127.0.0.1:5173`) are permitted only in non-production environment profiles.
- **Allowed Methods & Headers**:
  - Permitted HTTP Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
  - Permitted Headers: `Content-Type`, `Authorization`, `X-Correlation-ID`, `X-Requested-With`.
  - Credentials Support: `Access-Control-Allow-Credentials: true` is enabled strictly for whitelisted trusted origins requiring session cookies or credentials.

---

## 2. Review and Change Approval Process
- **Change Request Protocol**: Any addition or modification to the allowed origins list must be submitted via a pull request modifying the environment configurations and security gateway setup.
- **Security Assessment**: CORS modification pull requests require mandatory review and approval from the Security Engineering lead to prevent unintended exposure of internal API endpoints.

---

## 3. Ownership & Review Cadence
- **Primary Owner**: Security Engineering & Platform Infrastructure Team.
- **Review Cadence**: Audited semi-annually or whenever new frontend applications or external partner integrations are added to the ecosystem.