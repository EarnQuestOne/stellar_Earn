#!/bin/bash

# Snapshot Update Script for Earn Quest Contract
# This script automates the process of updating test snapshots

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SNAPSHOT_DIR="test_snapshots"
BACKUP_DIR="test_snapshots_backup"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Automate snapshot updates for Earn Quest contract tests.

OPTIONS:
    -h, --help              Show this help message
    -b, --backup            Create backup before updating snapshots
    -c, --clean             Clean all snapshots before regenerating
    -r, --restore           Restore snapshots from backup
    -t, --test <pattern>    Update snapshots for specific test pattern
    -v, --verify            Verify snapshots after update
    --no-backup             Skip backup creation (use with caution)

EXAMPLES:
    $0                      Update all snapshots with backup
    $0 --clean              Clean and regenerate all snapshots
    $0 -t test_admin        Update only admin test snapshots
    $0 --restore            Restore from last backup
    $0 --verify             Verify current snapshots

EOF
    exit 0
}

# Function to count snapshots
count_snapshots() {
    local dir=$1
    if [ -d "$dir" ]; then
        find "$dir" -name "*.json" -type f | wc -l
    else
        echo "0"
    fi
}

# Function to create backup
create_backup() {
    print_info "Creating backup of existing snapshots..."
    
    if [ ! -d "$SNAPSHOT_DIR" ]; then
        print_warning "No snapshot directory found. Skipping backup."
        return 0
    fi
    
    local snapshot_count=$(count_snapshots "$SNAPSHOT_DIR")
    if [ "$snapshot_count" -eq 0 ]; then
        print_warning "No snapshots found. Skipping backup."
        return 0
    fi
    
    # Create backup with timestamp
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}_${timestamp}"
    
    cp -r "$SNAPSHOT_DIR" "$backup_path"
    
    # Keep only last 5 backups
    ls -dt ${BACKUP_DIR}_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    print_success "Backup created: $backup_path ($snapshot_count snapshots)"
}

# Function to restore from backup
restore_backup() {
    print_info "Restoring snapshots from backup..."
    
    # Find most recent backup
    local latest_backup=$(ls -dt ${BACKUP_DIR}_* 2>/dev/null | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        print_error "No backup found to restore from."
        exit 1
    fi
    
    # Remove current snapshots
    if [ -d "$SNAPSHOT_DIR" ]; then
        rm -rf "$SNAPSHOT_DIR"
    fi
    
    # Restore from backup
    cp -r "$latest_backup" "$SNAPSHOT_DIR"
    
    local snapshot_count=$(count_snapshots "$SNAPSHOT_DIR")
    print_success "Restored $snapshot_count snapshots from: $latest_backup"
}

# Function to clean snapshots
clean_snapshots() {
    print_info "Cleaning existing snapshots..."
    
    if [ -d "$SNAPSHOT_DIR" ]; then
        local count=$(count_snapshots "$SNAPSHOT_DIR")
        rm -rf "$SNAPSHOT_DIR"
        mkdir -p "$SNAPSHOT_DIR"
        print_success "Cleaned $count snapshots"
    else
        mkdir -p "$SNAPSHOT_DIR"
        print_info "Created snapshot directory"
    fi
}

# Function to update snapshots
update_snapshots() {
    local test_pattern=$1
    
    print_info "Updating snapshots..."
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    
    # Set environment variable to update snapshots
    export SOROBAN_UPDATE_SNAPSHOTS=1
    
    if [ -n "$test_pattern" ]; then
        print_info "Running tests matching pattern: $test_pattern"
        cargo test "$test_pattern" --features testutils 2>&1 | tee /tmp/snapshot_update.log
    else
        print_info "Running all tests..."
        cargo test --features testutils 2>&1 | tee /tmp/snapshot_update.log
    fi
    
    local exit_code=${PIPESTATUS[0]}
    
    unset SOROBAN_UPDATE_SNAPSHOTS
    
    if [ $exit_code -eq 0 ]; then
        local snapshot_count=$(count_snapshots "$SNAPSHOT_DIR")
        print_success "Snapshots updated successfully! Total: $snapshot_count"
    else
        print_error "Test execution failed. Check /tmp/snapshot_update.log for details."
        exit $exit_code
    fi
}

# Function to verify snapshots
verify_snapshots() {
    print_info "Verifying snapshots..."
    
    cd "$SCRIPT_DIR"
    
    # Run tests without updating snapshots
    cargo test --features testutils 2>&1 | tee /tmp/snapshot_verify.log
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        print_success "All snapshots verified successfully!"
    else
        print_error "Snapshot verification failed. Check /tmp/snapshot_verify.log for details."
        exit $exit_code
    fi
}

# Function to show snapshot statistics
show_stats() {
    print_info "Snapshot Statistics:"
    
    if [ ! -d "$SNAPSHOT_DIR" ]; then
        print_warning "No snapshot directory found."
        return
    fi
    
    local total=$(count_snapshots "$SNAPSHOT_DIR")
    local total_size=$(du -sh "$SNAPSHOT_DIR" 2>/dev/null | cut -f1)
    
    echo "  Total snapshots: $total"
    echo "  Total size: $total_size"
    echo "  Location: $SNAPSHOT_DIR"
    
    # Show backup info
    local backup_count=$(ls -d ${BACKUP_DIR}_* 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 0 ]; then
        echo "  Backups available: $backup_count"
        echo "  Latest backup: $(ls -dt ${BACKUP_DIR}_* 2>/dev/null | head -n 1)"
    fi
}

# Main script logic
main() {
    local do_backup=true
    local do_clean=false
    local do_restore=false
    local do_verify=false
    local test_pattern=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                ;;
            -b|--backup)
                do_backup=true
                shift
                ;;
            -c|--clean)
                do_clean=true
                shift
                ;;
            -r|--restore)
                do_restore=true
                shift
                ;;
            -t|--test)
                test_pattern="$2"
                shift 2
                ;;
            -v|--verify)
                do_verify=true
                shift
                ;;
            --no-backup)
                do_backup=false
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    echo ""
    print_info "Earn Quest Snapshot Update Tool"
    echo "================================"
    echo ""
    
    # Handle restore
    if [ "$do_restore" = true ]; then
        restore_backup
        show_stats
        exit 0
    fi
    
    # Handle verify
    if [ "$do_verify" = true ]; then
        verify_snapshots
        show_stats
        exit 0
    fi
    
    # Show current stats
    show_stats
    echo ""
    
    # Create backup if requested
    if [ "$do_backup" = true ]; then
        create_backup
    fi
    
    # Clean if requested
    if [ "$do_clean" = true ]; then
        clean_snapshots
    fi
    
    # Update snapshots
    update_snapshots "$test_pattern"
    
    echo ""
    show_stats
    echo ""
    print_success "Snapshot update complete!"
}

# Run main function
main "$@"
