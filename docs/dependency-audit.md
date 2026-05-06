# Dependency Audit Guide

This document explains the dependency audit implementation for the stellar_Earn project.

## Overview

The dependency audit system provides automated security vulnerability scanning and reporting for both Rust (Soroban contracts) and Node.js dependencies across the entire monorepo.

## Features

- **Multi-language Support**: Rust (cargo) and Node.js (npm) dependency auditing
- **Automated CI/CD Integration**: Security audits run on every push and pull request
- **Weekly Scheduled Audits**: Regular monitoring for new vulnerabilities
- **Bloat Reduction**: `depcheck` integration to identify and remove unused dependencies
- **Comprehensive Reporting**: Detailed audit reports and artifact uploads
- **Local Development Tools**: Easy-to-use scripts for manual audits
- **License Compliance**: Automated license checking for Rust dependencies

## CI/CD Implementation

### GitHub Actions Workflow

#### Dependency Audit Workflow (`.github/workflows/dependency-audit.yml`)

**Triggers:**
- Push to main/master branches
- Pull requests to main/master branches  
- Weekly schedule (Mondays at 9:00 UTC)

**Jobs:**

##### 1. Cargo Audit (Rust Dependencies)
- **Matrix Testing**: Rust stable and beta versions
- **Security Tools**: 
  - `cargo audit` - Security vulnerability scanning
  - `cargo deny` - License and advisory checking
  - `cargo outdated` - Dependency version monitoring
- **Failure Conditions**: Build fails on high/critical vulnerabilities
- **Artifacts**: Detailed audit reports uploaded

##### 2. Frontend Audit (Node.js Dependencies)
- **Matrix Testing**: Node.js 18.x and 20.x versions
- **Projects Scanned**:
  - FrontEnd/my-app (React/Next.js frontend)
  - BackEnd (NestJS backend)
- **Security Level**: Moderate+ severity threshold
- **Artifacts**: Frontend-specific audit reports

### Security Configuration

#### Cargo Deny Configuration (`contracts/earn-quest/deny.toml`)

**License Policy:**
- **Allowed**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, MPL-2.0
- **Denied**: GPL-2.0, GPL-3.0, AGPL-1.0, AGPL-3.0
- **Copyleft**: Warn level (review required)

**Security Thresholds:**
- **Vulnerabilities**: Deny (fail build)
- **Unmaintained**: Warn (report but don't fail)
- **Yanked**: Warn (report but don't fail)
- **Severity Threshold**: Medium (report medium+ issues)

## Local Development

### Available Scripts

#### Comprehensive Audit Script
```bash
# Run full dependency audit
./scripts/audit-dependencies.sh

# Run audit with automatic fixes
./scripts/audit-dependencies.sh --fix

# Audit only Rust dependencies
./scripts/audit-dependencies.sh --rust-only

# Audit only Node.js dependencies
./scripts/audit-dependencies.sh --nodejs-only

# Show help
./scripts/audit-dependencies.sh --help
```

#### Manual Commands

**Rust Dependencies:**
```bash
cd contracts/earn-quest

# Security audit
cargo audit

# License and advisory check
cargo deny check advisories

# Check for outdated dependencies
cargo outdated

# Update dependencies
cargo update
```

**Node.js Dependencies:**
```bash
# Frontend
cd FrontEnd/my-app
npm audit
npm audit fix

# Check for unused dependencies
npm install -g depcheck
depcheck

# Backend
cd BackEnd
npm audit
npm audit fix
```

### Tool Installation

The audit script automatically installs required tools:
- `cargo-audit` - Security vulnerability scanner
- `cargo-deny` - License and policy checker
- `cargo-outdated` - Dependency version checker

## Security Levels

### Rust Dependencies (cargo audit)

- **Low**: Informational issues, minimal security impact
- **Medium**: Issues that should be addressed but aren't critical
- **High**: Serious vulnerabilities that should be fixed promptly
- **Critical**: Extremely severe vulnerabilities requiring immediate action

### Node.js Dependencies (npm audit)

- **Info**: Informational issues
- **Low**: Minor issues with limited impact
- **Moderate**: Issues that should be addressed
- **High**: Serious vulnerabilities requiring prompt attention
- **Critical**: Extremely severe vulnerabilities requiring immediate action

## Reports and Artifacts

### GitHub Actions Artifacts

Each audit run generates:
- `audit-report-{rust-version}.md`: Rust audit summary
- `frontend-audit-report-{node-version}.md`: Node.js audit summary

### Local Reports

Running the audit script generates:
- `dependency-audit-report.md`: Comprehensive audit summary with:
  - Rust cargo audit results
  - Cargo deny license checks
  - Outdated dependency analysis
  - Frontend/Backend npm audit results
  - Recommendations and next steps

## Best Practices

### Regular Maintenance

1. **Weekly Reviews**: Check scheduled audit results
2. **Prompt Fixes**: Address high/critical vulnerabilities immediately
3. **Dependency Updates**: Keep packages updated to prevent vulnerabilities
4. **License Monitoring**: Review new license requirements

### Development Workflow

1. **Before Commit**: Run `./scripts/audit-dependencies.sh`
2. **After Updates**: Run `./scripts/audit-dependencies.sh --fix`
3. **PR Reviews**: Check audit results in pull request workflows
4. **Security Meetings**: Review audit trends and policies

### Troubleshooting

#### Common Issues

**Cargo audit fails on dependency conflicts:**
```bash
cd contracts/earn-quest
cargo update
cargo audit
```

**npm audit fails on version conflicts:**
```bash
cd FrontEnd/my-app  # or BackEnd
rm -rf node_modules package-lock.json
npm install
npm audit fix
```

**License compliance issues:**
- Review `deny.toml` configuration
- Consider alternative packages with compatible licenses
- Update license exceptions if necessary

**False positives:**
- Review security advisory details
- Check if vulnerability applies to your usage
- Consider ignoring specific advisories in configuration

## Integration with Development Tools

### IDE Integration

**VS Code:**
- Rust Analyzer: Built-in cargo audit integration
- ESLint/Security extensions for Node.js

**Other IDEs:**
- Configure external tool integration for cargo commands
- Set up npm audit as pre-commit hook

### Pre-commit Hooks

Consider adding pre-commit hooks for security:
```bash
# Example pre-commit hook
#!/bin/sh
./scripts/audit-dependencies.sh --rust-only
./scripts/audit-dependencies.sh --nodejs-only
```

## Monitoring and Alerts

### GitHub Actions Notifications

Configure repository notifications for:
- Workflow failures (high/critical vulnerabilities)
- Weekly audit summaries
- Security advisories

### External Monitoring

Consider integrating with:
- GitHub Dependabot (automated dependency updates)
- Snyk security scanning (additional security coverage)
- OWASP dependency checking (comprehensive security analysis)

## Configuration Files

### Key Files

- `.github/workflows/dependency-audit.yml` - CI/CD workflow
- `contracts/earn-quest/deny.toml` - Cargo deny configuration
- `scripts/audit-dependencies.sh` - Local audit script
- `docs/dependency-audit.md` - This documentation

### Customization

**Adjust Security Thresholds:**
- Modify `severity-threshold` in `deny.toml`
- Update `--audit-level` in workflow files
- Configure failure conditions in CI/CD

**License Policy:**
- Update `allow`/`deny` lists in `deny.toml`
- Add license exceptions as needed
- Configure copyleft handling

## Contributing

When contributing to the audit system:

1. **Test Changes**: Verify audit workflow modifications
2. **Update Documentation**: Keep this guide current
3. **Security Focus**: Prioritize security improvements
4. **Backward Compatibility**: Ensure existing workflows continue working

## Support

For issues with the dependency audit system:

1. Check GitHub Actions workflow logs
2. Review generated audit reports
3. Consult this documentation
4. Verify tool installations:
   - Rust toolchain and cargo commands
   - Node.js and npm availability

---

*Last updated: $(date)*
*Part of stellar_Earn security implementation*
