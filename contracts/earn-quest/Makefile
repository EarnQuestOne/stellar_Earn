.PHONY: help test build snapshots snapshots-clean snapshots-verify snapshots-restore snapshots-backup

# Default target
help:
	@echo "Earn Quest Contract - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "Building & Testing:"
	@echo "  make build              - Build the contract"
	@echo "  make test               - Run all tests"
	@echo "  make test-verbose       - Run tests with verbose output"
	@echo ""
	@echo "Snapshot Management:"
	@echo "  make snapshots          - Update all snapshots (with backup)"
	@echo "  make snapshots-clean    - Clean and regenerate all snapshots"
	@echo "  make snapshots-verify   - Verify current snapshots"
	@echo "  make snapshots-restore  - Restore from last backup"
	@echo "  make snapshots-backup   - Create manual backup"
	@echo "  make snapshots-stats    - Show snapshot statistics"
	@echo ""
	@echo "Specific Test Snapshots:"
	@echo "  make snapshots-admin    - Update admin test snapshots"
	@echo "  make snapshots-quest    - Update quest test snapshots"
	@echo "  make snapshots-payout   - Update payout test snapshots"
	@echo "  make snapshots-security - Update security test snapshots"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean              - Clean build artifacts"
	@echo "  make clean-all          - Clean everything including snapshots"

# Build the contract
build:
	@echo "Building contract..."
	cargo build --release --target wasm32-unknown-unknown

# Run tests
test:
	@echo "Running tests..."
	cargo test

# Run tests with verbose output
test-verbose:
	@echo "Running tests (verbose)..."
	cargo test -- --nocapture

# Update all snapshots with backup
snapshots:
	@./update-snapshots.sh

# Clean and regenerate all snapshots
snapshots-clean:
	@./update-snapshots.sh --clean

# Verify current snapshots
snapshots-verify:
	@./update-snapshots.sh --verify

# Restore snapshots from backup
snapshots-restore:
	@./update-snapshots.sh --restore

# Create manual backup
snapshots-backup:
	@./update-snapshots.sh --backup
	@echo "Backup created. Run 'make snapshots-restore' to restore if needed."

# Show snapshot statistics
snapshots-stats:
	@echo "Snapshot Statistics:"
	@echo "==================="
	@if [ -d "test_snapshots" ]; then \
		echo "Total snapshots: $$(find test_snapshots -name '*.json' | wc -l)"; \
		echo "Total size: $$(du -sh test_snapshots | cut -f1)"; \
		echo "Location: test_snapshots/"; \
		echo ""; \
		echo "Backups:"; \
		ls -lht test_snapshots_backup_* 2>/dev/null | head -5 || echo "  No backups found"; \
	else \
		echo "No snapshot directory found."; \
	fi

# Update specific test snapshots
snapshots-admin:
	@./update-snapshots.sh --test test_admin

snapshots-quest:
	@./update-snapshots.sh --test test_quest

snapshots-payout:
	@./update-snapshots.sh --test test_payout

snapshots-security:
	@./update-snapshots.sh --test test_security

snapshots-pause:
	@./update-snapshots.sh --test test_pause

snapshots-batch:
	@./update-snapshots.sh --test test_batch

snapshots-bounds:
	@./update-snapshots.sh --test test_bounds

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cargo clean

# Clean everything including snapshots and backups
clean-all: clean
	@echo "Cleaning snapshots and backups..."
	@rm -rf test_snapshots_backup_*
	@echo "Done!"
