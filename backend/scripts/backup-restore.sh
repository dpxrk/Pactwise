#!/bin/bash

# =============================================================================
# Pactwise Database Backup & Restore Script
# =============================================================================
# Usage:
#   ./backup-restore.sh backup [environment] [type]
#   ./backup-restore.sh restore [backup-file] [target-db-url]
#   ./backup-restore.sh list [environment]
#   ./backup-restore.sh verify [backup-file]
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_BUCKET="${BACKUP_BUCKET:-pactwise-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_dependencies() {
    local missing=()

    command -v pg_dump >/dev/null 2>&1 || missing+=("postgresql-client")
    command -v pg_restore >/dev/null 2>&1 || missing+=("postgresql-client")
    command -v aws >/dev/null 2>&1 || missing+=("aws-cli")
    command -v gzip >/dev/null 2>&1 || missing+=("gzip")

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_info "Install with: apt-get install ${missing[*]}"
        exit 1
    fi
}

# Get database URL from Supabase
get_db_url() {
    local env="$1"

    if command -v supabase >/dev/null 2>&1; then
        supabase db url --linked 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Create a backup
do_backup() {
    local environment="${1:-production}"
    local backup_type="${2:-full}"
    local backup_file="${environment}-${backup_type}-${TIMESTAMP}.sql"

    log_info "Creating ${backup_type} backup for ${environment}..."

    # Get database URL
    local db_url="${DATABASE_URL:-$(get_db_url "$environment")}"

    if [ -z "$db_url" ]; then
        log_error "DATABASE_URL not set and couldn't get URL from Supabase"
        log_info "Set DATABASE_URL environment variable or link Supabase project"
        exit 1
    fi

    # Perform backup based on type
    case "$backup_type" in
        full)
            log_info "Performing full database backup..."
            pg_dump "$db_url" \
                --verbose \
                --no-owner \
                --no-privileges \
                --clean \
                --if-exists \
                --format=custom \
                --file="$backup_file"
            ;;
        schema)
            log_info "Performing schema-only backup..."
            pg_dump "$db_url" \
                --schema-only \
                --no-owner \
                --no-privileges \
                --format=plain \
                --file="$backup_file"
            ;;
        data)
            log_info "Performing data-only backup..."
            pg_dump "$db_url" \
                --data-only \
                --format=custom \
                --file="$backup_file"
            ;;
        *)
            log_error "Unknown backup type: $backup_type"
            log_info "Valid types: full, schema, data"
            exit 1
            ;;
    esac

    # Compress
    log_info "Compressing backup..."
    gzip -9 "$backup_file"
    backup_file="${backup_file}.gz"

    # Calculate checksum
    local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    local size=$(ls -lh "$backup_file" | awk '{print $5}')

    log_info "Backup created: $backup_file"
    log_info "Size: $size"
    log_info "Checksum: $checksum"

    # Upload to S3 if bucket is configured
    if [ -n "${BACKUP_BUCKET:-}" ]; then
        log_info "Uploading to S3..."
        local s3_path="s3://${BACKUP_BUCKET}/backups/${environment}/${backup_type}/${backup_file}"

        aws s3 cp "$backup_file" "$s3_path" \
            --storage-class INTELLIGENT_TIERING \
            --metadata "environment=${environment},type=${backup_type},checksum=${checksum},timestamp=${TIMESTAMP}"

        log_info "Uploaded to: $s3_path"

        # Create success marker
        echo "{
            \"environment\": \"${environment}\",
            \"type\": \"${backup_type}\",
            \"timestamp\": \"${TIMESTAMP}\",
            \"size\": \"${size}\",
            \"checksum\": \"${checksum}\",
            \"file\": \"${backup_file}\",
            \"s3_path\": \"${s3_path}\"
        }" > "${TIMESTAMP}-success.json"

        aws s3 cp "${TIMESTAMP}-success.json" \
            "s3://${BACKUP_BUCKET}/backups/${environment}/${backup_type}/${TIMESTAMP}-success.json"

        rm "${TIMESTAMP}-success.json"
    fi

    log_info "Backup complete!"
    echo "$backup_file"
}

# Restore from a backup
do_restore() {
    local backup_file="$1"
    local target_db="${2:-}"

    log_warn "WARNING: This will overwrite the target database!"
    log_warn "Target: ${target_db:-'DATABASE_URL environment variable'}"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled."
        exit 0
    fi

    # Download from S3 if it's an S3 path
    if [[ "$backup_file" == s3://* ]]; then
        log_info "Downloading backup from S3..."
        local local_file=$(basename "$backup_file")
        aws s3 cp "$backup_file" "$local_file"
        backup_file="$local_file"
    fi

    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        log_info "Decompressing backup..."
        gunzip -k "$backup_file"
        backup_file="${backup_file%.gz}"
    fi

    # Get target database URL
    local db_url="${target_db:-${DATABASE_URL:-}}"

    if [ -z "$db_url" ]; then
        log_error "No target database URL provided"
        log_info "Usage: $0 restore <backup-file> <database-url>"
        exit 1
    fi

    log_info "Restoring to database..."

    # Determine restore method based on format
    if [[ "$backup_file" == *.sql ]]; then
        # Plain SQL file
        psql "$db_url" < "$backup_file"
    else
        # Custom format
        pg_restore \
            --verbose \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            --dbname="$db_url" \
            "$backup_file"
    fi

    log_info "Restore complete!"
}

# List available backups
do_list() {
    local environment="${1:-production}"

    log_info "Listing backups for ${environment}..."

    if [ -z "${BACKUP_BUCKET:-}" ]; then
        log_error "BACKUP_BUCKET not set"
        exit 1
    fi

    echo ""
    echo "Available backups:"
    echo "=================="

    aws s3api list-objects-v2 \
        --bucket "$BACKUP_BUCKET" \
        --prefix "backups/${environment}/" \
        --query "Contents[?contains(Key, '.sql.gz')].[Key,Size,LastModified]" \
        --output table
}

# Verify a backup file
do_verify() {
    local backup_file="$1"

    log_info "Verifying backup: $backup_file"

    # Download from S3 if needed
    if [[ "$backup_file" == s3://* ]]; then
        log_info "Downloading from S3..."
        local local_file=$(basename "$backup_file")
        aws s3 cp "$backup_file" "$local_file"
        backup_file="$local_file"
    fi

    # Check file exists
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    # Test gzip integrity
    if [[ "$backup_file" == *.gz ]]; then
        log_info "Testing compression integrity..."
        if gunzip -t "$backup_file"; then
            log_info "Compression: OK"
        else
            log_error "Compression: FAILED"
            exit 1
        fi
    fi

    # Check for SQL content
    log_info "Checking backup content..."
    local content=$(gunzip -c "$backup_file" 2>/dev/null | head -n 100)

    if echo "$content" | grep -q "CREATE TABLE\|INSERT INTO\|COPY"; then
        log_info "SQL content: OK"
    else
        log_error "SQL content: INVALID or EMPTY"
        exit 1
    fi

    # Show file info
    local size=$(ls -lh "$backup_file" | awk '{print $5}')
    local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)

    echo ""
    echo "Backup verification: PASSED"
    echo "=========================="
    echo "File: $backup_file"
    echo "Size: $size"
    echo "SHA256: $checksum"
}

# Print usage
usage() {
    echo "Pactwise Database Backup & Restore"
    echo ""
    echo "Usage:"
    echo "  $0 backup [environment] [type]   Create a backup"
    echo "  $0 restore <file> [db-url]       Restore from backup"
    echo "  $0 list [environment]            List available backups"
    echo "  $0 verify <file>                 Verify backup integrity"
    echo ""
    echo "Environments: production, staging, development"
    echo "Backup types: full, schema, data"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_URL     Database connection string"
    echo "  BACKUP_BUCKET    S3 bucket for backups"
    echo "  AWS_REGION       AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0 backup production full"
    echo "  $0 restore production-full-20240126-123456.sql.gz"
    echo "  $0 list production"
    echo "  $0 verify s3://pactwise-backups/backups/production/full/backup.sql.gz"
}

# Main entry point
main() {
    check_dependencies

    local command="${1:-help}"
    shift || true

    case "$command" in
        backup)
            do_backup "$@"
            ;;
        restore)
            do_restore "$@"
            ;;
        list)
            do_list "$@"
            ;;
        verify)
            do_verify "$@"
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

main "$@"
