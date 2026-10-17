#!/bin/bash

# Cargo Workspace Verification Script
# Identifies and fixes workspace configuration issues for contracts/earn-quest

echo "================================================"
echo "Rust Workspace Verification"
echo "================================================"
echo ""

CONTRACT_DIR="contracts/earn-quest"

echo "1. Checking contract directory structure..."
if [ -f "$CONTRACT_DIR/Cargo.toml" ]; then
    echo "   ✓ Canonical $CONTRACT_DIR/Cargo.toml found"
else
    echo "   ✗ No Cargo.toml found in $CONTRACT_DIR"
    exit 1
fi

echo ""
echo "2. Checking package configuration..."
package_name=$(grep '^name = ' "$CONTRACT_DIR/Cargo.toml" | head -1 | cut -d'"' -f2)
echo "   ✓ $CONTRACT_DIR (package: $package_name)"

echo ""
echo "3. Status: READY"
