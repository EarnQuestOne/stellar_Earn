# Backend Coding-Style and Linting Governance

## Overview
This document defines the official coding-style, formatting, and static analysis (linting) standards for backend services in **EarnQuestOne/stellar_Earn**. Enforcing consistent code standards ensures high maintainability, reduces cognitive overhead, and prevents common runtime errors across microservices and Stellar blockchain integration modules.

---

## 1. Lint & Format Rules
- **Language Standards**: All backend services (Node.js/TypeScript and Rust) must strictly adhere to the project's shared configuration files (`tsconfig.json`, `.eslintrc.json`, `prettier.config.js`, and `rustfmt.toml`).
- **Formatting**: Automatic code formatting via Prettier or `rustfmt` is mandatory prior to committing code. Unformatted code will fail automated CI lint checks.
- **Static Analysis**: ESLint and Clippy must report zero warnings and zero errors during CI builds. Disabling lint rules inline (e.g., via `eslint-disable` or `#[allow(...)]`) is strongly discouraged and requires explicit justification.

---

## 2. Exception & Rule Override Process
- **Temporary Overrides**: If a specific line of code requires bypassing a lint or format rule, developers must use explicit, scoped suppression comments accompanied by a explanatory ticket reference (e.g., `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for dynamic JSON payload parsing in issue #...`).
- **Permanent Rule Changes**: Proposals to modify shared lint rules or formatting presets must be submitted as an RFC or Pull Request targeting the root configuration files and require approval from core backend maintainers.

---

## 3. Ownership & Review Cadence
- **Primary Owner**: Backend Engineering & Core Architecture Team.
- **Review Cadence**: Audited annually or upon major runtime/language version upgrades.