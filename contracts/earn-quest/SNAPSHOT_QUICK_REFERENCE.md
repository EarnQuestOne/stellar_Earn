# Snapshot Management - Quick Reference

## Most Common Commands

```bash
# Update all snapshots
make snapshots

# Verify snapshots
make snapshots-verify

# Restore from backup
make snapshots-restore

# Show statistics
make snapshots-stats
```

## Update Specific Tests

```bash
make snapshots-admin        # Admin functionality
make snapshots-quest        # Quest operations
make snapshots-payout       # Payment/rewards
make snapshots-security     # Security tests
make snapshots-pause        # Pause mechanism
make snapshots-batch        # Batch operations
make snapshots-bounds       # Bounds checking
```

## When to Update Snapshots

✅ **Update when:**
- You modify contract logic
- You add new features
- You fix bugs that change behavior
- Tests pass but snapshots don't match

❌ **Don't update when:**
- Tests are failing due to bugs
- You haven't reviewed the changes
- You're not sure what changed

## Workflow

```bash
# 1. Make code changes
vim src/admin.rs

# 2. Run tests
cargo test

# 3. Update snapshots
make snapshots

# 4. Review changes
git diff test_snapshots/

# 5. Verify
make snapshots-verify

# 6. Commit
git add test_snapshots/
git commit -m "test: update snapshots for admin changes"
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Snapshots won't update | `make snapshots-clean` |
| Need to undo changes | `make snapshots-restore` |
| Tests failing | Check `/tmp/snapshot_verify.log` |
| Out of sync | `make snapshots-clean` then `make snapshots-verify` |

## File Locations

- **Snapshots**: `test_snapshots/*.json` (174 files)
- **Backups**: `test_snapshots_backup_*/`
- **Logs**: `/tmp/snapshot_update.log`, `/tmp/snapshot_verify.log`

## Help

```bash
# Script help
./update-snapshots.sh --help

# Make help
make help
```
