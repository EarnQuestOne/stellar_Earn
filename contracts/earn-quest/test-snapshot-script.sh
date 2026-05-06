#!/bin/bash

# Test script for snapshot automation
# This script validates that the snapshot management system works correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing Snapshot Management System"
echo "==================================="
echo ""

# Test 1: Script exists and is executable
echo -n "Test 1: Script is executable... "
if [ -x "./update-snapshots.sh" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 2: Help command works
echo -n "Test 2: Help command works... "
if ./update-snapshots.sh --help > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 3: Makefile exists
echo -n "Test 3: Makefile exists... "
if [ -f "Makefile" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 4: Make help works
echo -n "Test 4: Make help works... "
if make help > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 5: Snapshot directory exists
echo -n "Test 5: Snapshot directory exists... "
if [ -d "test_snapshots" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 6: Snapshots exist
echo -n "Test 6: Snapshots exist... "
snapshot_count=$(find test_snapshots -name "*.json" -type f | wc -l)
if [ "$snapshot_count" -gt 0 ]; then
    echo -e "${GREEN}PASS${NC} ($snapshot_count snapshots)"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 7: Make stats works
echo -n "Test 7: Make stats works... "
if make snapshots-stats > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 8: Documentation exists
echo -n "Test 8: Documentation exists... "
if [ -f "SNAPSHOT_MANAGEMENT.md" ] && [ -f "SNAPSHOT_QUICK_REFERENCE.md" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 9: Cargo.toml has testutils feature
echo -n "Test 9: Cargo.toml configured... "
if grep -q "testutils" Cargo.toml; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (testutils feature not found)"
fi

# Test 10: README mentions snapshots
echo -n "Test 10: README updated... "
if grep -q "snapshot" README.md; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (README not updated)"
fi

echo ""
echo -e "${GREEN}All critical tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - Snapshot automation script: ✓"
echo "  - Makefile commands: ✓"
echo "  - Documentation: ✓"
echo "  - Current snapshots: $snapshot_count files"
echo ""
echo "Next steps:"
echo "  1. Run 'make snapshots-verify' to verify current snapshots"
echo "  2. Try 'make snapshots-backup' to create a manual backup"
echo "  3. Review SNAPSHOT_MANAGEMENT.md for full documentation"
