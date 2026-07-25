# Snapshot Management Guide

## Overview

This document describes the automated snapshot management system for the Earn Quest contract tests. The system manages 174 test snapshot files that capture the state of contract execution for regression testing.

## What are Snapshots?

Test snapshots are JSON files that record the complete state of a Soroban contract test execution, including:
- Contract storage state
- Authentication records
- Ledger entries
- Events emitted
- Function call traces

These snapshots ensure that contract behavior remains consistent across code changes.

## Quick Start

### Update All Snapshots

```bash
# Using the script directly
./update-snapshots.sh

# Using Make
make snapshots
```

### Update Specific Test Snapshots

```bash
# Update only admin tests
./update-snapshots.sh --test test_admin

# Or using Make
make snapshots-admin
```

### Verify Snapshots

```bash
# Verify all snapshots match current behavior
./update-snapshots.sh --verify

# Or using Make
make snapshots-verify
```

## Available Commands

### Using the Shell Script

The `update-snapshots.sh` script provides comprehensive snapshot management:

```bash
# Show help and all options
./update-snapshots.sh --help

# Update all snapshots (creates backup automatically)
./update-snapshots.sh

# Clean and regenerate all snapshots
./update-snapshots.sh --clean

# Update specific test pattern
./update-snapshots.sh --test test_admin

# Verify snapshots without updating
./update-snapshots.sh --verify

# Restore from last backup
./update-snapshots.sh --restore

# Update without creating backup (not recommended)
./update-snapshots.sh --no-backup
```

### Using Make

The Makefile provides convenient shortcuts:

```bash
# Show all available commands
make help

# Snapshot operations
make snapshots              # Update all snapshots
make snapshots-clean        # Clean and regenerate
make snapshots-verify       # Verify current snapshots
make snapshots-restore      # Restore from backup
make snapshots-backup       # Create manual backup
make snapshots-stats        # Show statistics

# Update specific test categories
make snapshots-admin        # Admin tests
make snapshots-quest        # Quest tests
make snapshots-payout       # Payout tests
make snapshots-security     # Security tests
make snapshots-pause        # Pause tests
make snapshots-batch        # Batch operation tests
make snapshots-bounds       # Bounds checking tests
```

## Workflow Examples

### Scenario 1: Making Contract Changes

When you modify contract code and need to update snapshots:

```bash
# 1. Make your code changes
vim src/admin.rs

# 2. Run tests to see what changed
cargo test

# 3. Update snapshots (backup created automatically)
make snapshots

# 4. Verify the updates
make snapshots-verify

# 5. Review changes in git
git diff test_snapshots/
```

### Scenario 2: Updating Specific Test Category

When you only changed admin-related functionality:

```bash
# Update only admin test snapshots
make snapshots-admin

# Or with the script
./update-snapshots.sh --test test_admin
```

### Scenario 3: Complete Regeneration

When you need to regenerate all snapshots from scratch:

```bash
# Clean and regenerate everything
make snapshots-clean

# Verify the regeneration
make snapshots-verify
```

### Scenario 4: Recovering from Mistakes

If snapshot updates went wrong:

```bash
# Restore from the last backup
make snapshots-restore

# Or using the script
./update-snapshots.sh --restore
```

## Backup System

### Automatic Backups

Backups are created automatically when updating snapshots:
- Timestamped format: `test_snapshots_backup_YYYYMMDD_HHMMSS`
- Last 5 backups are kept automatically
- Older backups are automatically cleaned up

### Manual Backups

Create a manual backup before risky operations:

```bash
make snapshots-backup
```

### Restore from Backup

```bash
# Restore from the most recent backup
make snapshots-restore
```

## Snapshot Statistics

View information about your snapshots:

```bash
# Show detailed statistics
make snapshots-stats

# Output includes:
# - Total number of snapshots
# - Total disk space used
# - Available backups
# - Latest backup timestamp
```

## Integration with CI/CD

### Verifying Snapshots in CI

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Verify Snapshots
  run: |
    cd contracts/earn-quest
    make snapshots-verify
```

### Updating Snapshots in CI

For automated snapshot updates:

```yaml
- name: Update Snapshots
  run: |
    cd contracts/earn-quest
    make snapshots
    
- name: Commit Updated Snapshots
  run: |
    git config user.name "CI Bot"
    git config user.email "ci@example.com"
    git add test_snapshots/
    git commit -m "chore: update test snapshots" || true
    git push
```

## Troubleshooting

### Problem: Snapshots Won't Update

**Solution:**
```bash
# Clean and regenerate
make snapshots-clean

# Check for file permission issues
ls -la test_snapshots/
```

### Problem: Tests Fail After Snapshot Update

**Solution:**
```bash
# Restore previous snapshots
make snapshots-restore

# Review what changed
git diff test_snapshots/

# Fix the underlying issue in your code
```

### Problem: Too Many Snapshots

**Solution:**
```bash
# Check statistics
make snapshots-stats

# Clean old backups manually if needed
rm -rf test_snapshots_backup_*
```

### Problem: Snapshot Verification Fails

**Solution:**
```bash
# Run tests with verbose output
make test-verbose

# Check the verification log
cat /tmp/snapshot_verify.log

# Update snapshots if changes are intentional
make snapshots
```

## Best Practices

### 1. Always Review Changes

Before committing snapshot updates:
```bash
git diff test_snapshots/
```

Review the changes to ensure they match your expectations.

### 2. Update Incrementally

When making multiple changes:
- Update snapshots after each logical change
- Verify after each update
- Commit snapshots with related code changes

### 3. Use Specific Updates

When possible, update only affected test categories:
```bash
# Instead of updating everything
make snapshots

# Update only what changed
make snapshots-admin
```

### 4. Keep Backups

Before major refactoring:
```bash
# Create a manual backup
make snapshots-backup

# Make your changes
# ...

# Restore if needed
make snapshots-restore
```

### 5. Verify Before Committing

Always verify snapshots before pushing:
```bash
make snapshots-verify
```

## File Structure

```
contracts/earn-quest/
├── test_snapshots/              # Current snapshots (174 files)
│   ├── test_admin_*.json
│   ├── test_quest_*.json
│   ├── test_payout_*.json
│   └── ...
├── test_snapshots_backup_*/     # Timestamped backups (up to 5)
├── update-snapshots.sh          # Main automation script
├── Makefile                     # Convenient command shortcuts
└── SNAPSHOT_MANAGEMENT.md       # This documentation
```

## Snapshot Naming Convention

Snapshots follow this pattern:
```
<test_name>.<iteration>.json
```

Examples:
- `test_admin_can_add_admin.1.json`
- `test_quest_creation_succeeds.1.json`
- `malicious_token_cannot_double_claim_via_reentrancy.1.json`

The iteration number (`.1`, `.2`, etc.) indicates multiple snapshots for the same test.

## Environment Variables

### SOROBAN_UPDATE_SNAPSHOTS

Set this variable to enable snapshot updates:
```bash
export SOROBAN_UPDATE_SNAPSHOTS=1
cargo test
```

The update script handles this automatically.

## Maintenance Schedule

### Regular Maintenance

- **After each contract change**: Update affected snapshots
- **Before releases**: Verify all snapshots
- **Weekly**: Review snapshot statistics
- **Monthly**: Clean old backups if needed

### Cleanup

```bash
# Remove all backups (keeps current snapshots)
rm -rf test_snapshots_backup_*

# Complete cleanup (use with caution)
make clean-all
```

## Support

For issues or questions:
1. Check this documentation
2. Review the script help: `./update-snapshots.sh --help`
3. Check logs: `/tmp/snapshot_update.log` or `/tmp/snapshot_verify.log`
4. Review test output: `make test-verbose`

## Related Documentation

- [Soroban SDK Testing Guide](https://soroban.stellar.org/docs/how-to-guides/testing)
- [Contract README](./README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
