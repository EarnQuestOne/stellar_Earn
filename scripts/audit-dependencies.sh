#!/bin/bash

# Dependency Audit Script for stellar_Earn
# This script performs comprehensive dependency security checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install cargo tools if not present
install_cargo_tools() {
    print_status "Installing/Updating cargo audit tools..."
    
    if ! command_exists cargo-audit; then
        print_status "Installing cargo-audit..."
        cargo install cargo-audit
    else
        print_status "cargo-audit already installed"
    fi
    
    if ! command_exists cargo-deny; then
        print_status "Installing cargo-deny..."
        cargo install cargo-deny
    else
        print_status "cargo-deny already installed"
    fi
    
    if ! command_exists cargo-outdated; then
        print_status "Installing cargo-outdated..."
        cargo install cargo-outdated
    else
        print_status "cargo-outdated already installed"
    fi
}

# Function to audit Rust dependencies
audit_rust_dependencies() {
    local contract_dir="contracts/earn-quest"
    
    if [ ! -d "$contract_dir" ]; then
        print_error "Contract directory $contract_dir not found"
        return 1
    fi
    
    print_status "Auditing Rust dependencies in $contract_dir..."
    
    cd "$contract_dir"
    
    # Run cargo audit
    print_status "Running cargo audit..."
    if cargo audit; then
        print_success "cargo audit completed successfully"
    else
        print_warning "cargo audit found issues"
    fi
    
    # Run cargo deny
    print_status "Running cargo deny check..."
    if cargo deny check advisories; then
        print_success "cargo deny check completed successfully"
    else
        print_warning "cargo deny check found issues"
    fi
    
    # Check for outdated dependencies
    print_status "Checking for outdated dependencies..."
    if cargo outdated; then
        print_success "All dependencies are up to date"
    else
        print_warning "Some dependencies are outdated"
    fi
    
    cd - > /dev/null
}

# Function to audit Node.js dependencies
audit_nodejs_dependencies() {
    local frontend_dir="FrontEnd/my-app"
    local backend_dir="BackEnd"
    
    # Audit FrontEnd
    if [ -d "$frontend_dir" ]; then
        print_status "Auditing FrontEnd dependencies..."
        cd "$frontend_dir"
        
        if command_exists npm; then
            if npm audit --audit-level=moderate; then
                print_success "FrontEnd npm audit completed successfully"
            else
                print_warning "FrontEnd npm audit found issues"
            fi
        else
            print_warning "npm not found, skipping FrontEnd audit"
        fi
        
        cd - > /dev/null
    else
        print_warning "FrontEnd directory $frontend_dir not found"
    fi
    
    # Audit Backend
    if [ -d "$backend_dir" ]; then
        print_status "Auditing Backend dependencies..."
        cd "$backend_dir"
        
        if command_exists npm; then
            if npm audit --audit-level=moderate; then
                print_success "Backend npm audit completed successfully"
            else
                print_warning "Backend npm audit found issues"
            fi
        else
            print_warning "npm not found, skipping Backend audit"
        fi
        
        cd - > /dev/null
    else
        print_warning "Backend directory $backend_dir not found"
    fi
}

# Function to generate comprehensive report
generate_report() {
    local report_file="dependency-audit-report.md"
    
    print_status "Generating comprehensive audit report..."
    
    cat > "$report_file" << EOF
# Dependency Audit Report

**Generated:** $(date)
**Repository:** stellar_Earn

## Executive Summary

This report contains the results of comprehensive dependency security audits for the stellar_Earn project.

## Rust Dependencies Audit

### Cargo Audit Results
\`\`\`
$(cd contracts/earn-quest && cargo audit 2>&1 || echo "Audit completed with issues")
\`\`\`

### Cargo Deny Results
\`\`\`
$(cd contracts/earn-quest && cargo deny check advisories 2>&1 || echo "Deny check completed with issues")
\`\`\`

### Outdated Dependencies
\`\`\`
$(cd contracts/earn-quest && cargo outdated 2>&1 || echo "Outdated check completed")
\`\`\`

## Node.js Dependencies Audit

### FrontEnd Dependencies
\`\`\`
$(cd FrontEnd/my-app && npm audit --json 2>&1 || echo "FrontEnd audit completed" 2>/dev/null || echo "npm audit failed")
\`\`\`

### Backend Dependencies
\`\`\`
$(cd BackEnd && npm audit --json 2>&1 || echo "Backend audit completed" 2>/dev/null || echo "npm audit failed")
\`\`\`

## Recommendations

1. **High/Critical Vulnerabilities**: Address immediately
2. **Medium Vulnerabilities**: Address in next sprint
3. **Low Vulnerabilities**: Address in future maintenance
4. **Outdated Dependencies**: Update when convenient
5. **License Compliance**: Review any new license requirements

## Next Steps

1. Review and fix any high/critical vulnerabilities
2. Update outdated dependencies
3. Implement automated fixes where possible
4. Schedule regular dependency audits

---

*This report was generated automatically by the dependency audit script.*
EOF

    print_success "Report generated: $report_file"
}

# Function to fix common issues
fix_dependencies() {
    print_status "Attempting to fix common dependency issues..."
    
    # Fix Rust dependencies
    cd contracts/earn-quest
    
    # Update dependencies
    print_status "Updating Rust dependencies..."
    cargo update
    
    cd - > /dev/null
    
    # Fix Node.js dependencies
    if [ -d "FrontEnd/my-app" ]; then
        print_status "Fixing FrontEnd dependencies..."
        cd FrontEnd/my-app
        npm audit fix || true
        cd - > /dev/null
    fi
    
    if [ -d "BackEnd" ]; then
        print_status "Fixing Backend dependencies..."
        cd BackEnd
        npm audit fix || true
        cd - > /dev/null
    fi
    
    print_success "Dependency fix attempts completed"
}

# Main execution
main() {
    print_status "Starting comprehensive dependency audit for stellar_Earn..."
    
    # Install tools
    install_cargo_tools
    
    # Run audits
    audit_rust_dependencies
    audit_nodejs_dependencies
    
    # Generate report
    generate_report
    
    print_success "Dependency audit completed successfully!"
    print_status "Check the generated report for detailed findings and recommendations."
}

# Handle command line arguments
case "${1:-}" in
    --fix)
        print_status "Running dependency audit with fixes..."
        main
        fix_dependencies
        ;;
    --rust-only)
        install_cargo_tools
        audit_rust_dependencies
        ;;
    --nodejs-only)
        audit_nodejs_dependencies
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --fix         Run audit and attempt to fix issues"
        echo "  --rust-only   Only audit Rust dependencies"
        echo "  --nodejs-only Only audit Node.js dependencies"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Default behavior: Run comprehensive audit of all dependencies"
        ;;
    *)
        main
        ;;
esac
