#!/bin/bash

# Pactwise Disaster Recovery Script
# This script restores Pactwise from a backup

set -euo pipefail

# Configuration
RESTORE_DIR="/var/restore/pactwise"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-pactwise-backups}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/pactwise/backup.key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Show usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
    -t, --timestamp TIMESTAMP    Backup timestamp to restore (YYYYMMDD-HHMMSS)
    -l, --list                   List available backups
    -d, --dry-run               Perform a dry run without restoring
    -f, --force                 Force restore without confirmation
    -h, --help                  Show this help message

Examples:
    $0 --list                           # List available backups
    $0 --timestamp 20240101-120000      # Restore specific backup
    $0 --timestamp latest               # Restore latest backup
    $0 --timestamp 20240101-120000 -d   # Dry run
EOF
}

# Parse command line arguments
parse_args() {
    TIMESTAMP=""
    LIST_BACKUPS=false
    DRY_RUN=false
    FORCE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--timestamp)
                TIMESTAMP="$2"
                shift 2
                ;;
            -l|--list)
                LIST_BACKUPS=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# List available backups
list_backups() {
    log "Listing available backups..."
    
    aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --recursive \
        | grep -E "\.tar\.gz\.enc$" \
        | sort -r \
        | head -20 \
        | while read -r line; do
            local size=$(echo "$line" | awk '{print $3}')
            local date=$(echo "$line" | awk '{print $1}')
            local time=$(echo "$line" | awk '{print $2}')
            local file=$(echo "$line" | awk '{print $4}')
            local timestamp=$(basename "$file" | cut -d'-' -f3-4)
            
            printf "%-20s %s %s %10s\n" "$timestamp" "$date" "$time" "$(numfmt --to=iec-i --suffix=B $size)"
        done
}

# Get latest backup timestamp
get_latest_backup() {
    aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --recursive \
        | grep -E "\.tar\.gz\.enc$" \
        | sort -r \
        | head -1 \
        | awk '{print $4}' \
        | sed -E 's/.*pactwise-backup-([0-9]{8}-[0-9]{6})\.tar\.gz\.enc/\1/'
}

# Download backup from S3
download_backup() {
    local timestamp=$1
    log "Downloading backup from $timestamp..."
    
    # Find backup file
    local backup_file=$(aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --recursive \
        | grep "pactwise-backup-${timestamp}" \
        | awk '{print $4}')
    
    if [ -z "$backup_file" ]; then
        error "Backup not found for timestamp: $timestamp"
        return 1
    fi
    
    # Create restore directory
    mkdir -p "$RESTORE_DIR"
    
    # Download backup
    local local_file="${RESTORE_DIR}/$(basename "$backup_file")"
    if aws s3 cp "s3://${S3_BACKUP_BUCKET}/${backup_file}" "$local_file"; then
        log "Backup downloaded successfully"
        echo "$local_file"
    else
        error "Failed to download backup"
        return 1
    fi
}

# Decrypt and extract backup
decrypt_and_extract() {
    local encrypted_file=$1
    log "Decrypting and extracting backup..."
    
    cd "$RESTORE_DIR"
    
    # Decrypt
    local decrypted_file="${encrypted_file%.enc}"
    if openssl enc -aes-256-cbc \
        -d \
        -in "$encrypted_file" \
        -out "$decrypted_file" \
        -pass file:"$ENCRYPTION_KEY_FILE"; then
        log "Backup decrypted successfully"
    else
        error "Failed to decrypt backup"
        return 1
    fi
    
    # Extract
    if tar -xzf "$decrypted_file"; then
        log "Backup extracted successfully"
        
        # Clean up encrypted and compressed files
        rm -f "$encrypted_file" "$decrypted_file"
        
        # Return extracted directory
        echo "${RESTORE_DIR}/$(basename "$decrypted_file" .tar.gz)"
    else
        error "Failed to extract backup"
        return 1
    fi
}

# Validate backup
validate_backup() {
    local backup_dir=$1
    log "Validating backup..."
    
    # Check metadata
    if [ ! -f "${backup_dir}/metadata.json" ]; then
        error "Backup metadata not found"
        return 1
    fi
    
    # Check required directories
    for dir in convex uploads config; do
        if [ ! -d "${backup_dir}/${dir}" ]; then
            error "Missing backup component: $dir"
            return 1
        fi
    done
    
    # Display backup info
    info "Backup information:"
    cat "${backup_dir}/metadata.json" | jq . 2>/dev/null || cat "${backup_dir}/metadata.json"
    
    log "Backup validation passed"
}

# Restore Convex data
restore_convex() {
    local backup_dir=$1
    log "Restoring Convex data..."
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would restore Convex data from ${backup_dir}/convex/convex-data.json"
        return 0
    fi
    
    # Import Convex data
    if convex import --path "${backup_dir}/convex/convex-data.json" --yes; then
        log "Convex data restored successfully"
    else
        error "Failed to restore Convex data"
        return 1
    fi
}

# Restore uploaded files
restore_uploaded_files() {
    local backup_dir=$1
    log "Restoring uploaded files..."
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would restore uploaded files to S3"
        return 0
    fi
    
    # Sync files to S3
    if aws s3 sync "${backup_dir}/uploads" "s3://${S3_UPLOADS_BUCKET:-pactwise-uploads}" \
        --exclude "*.tmp" \
        --exclude "*/temp/*"; then
        log "Uploaded files restored successfully"
    else
        error "Failed to restore uploaded files"
        return 1
    fi
}

# Restore configuration
restore_configuration() {
    local backup_dir=$1
    log "Restoring configuration..."
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would restore configuration files"
        return 0
    fi
    
    # Restore configuration files
    for config_file in \
        .env.production \
        next.config.js \
        package.json \
        package-lock.json \
        tsconfig.json \
        docker-compose.yml; do
        if [ -f "${backup_dir}/config/$(basename "$config_file")" ]; then
            cp "${backup_dir}/config/$(basename "$config_file")" "./$config_file"
            log "Restored $config_file"
        fi
    done
    
    # Restore Kubernetes manifests
    if [ -d "${backup_dir}/config/k8s" ]; then
        mkdir -p ./k8s
        cp -r "${backup_dir}/config/k8s/"*.yaml ./k8s/
        log "Restored Kubernetes manifests"
    fi
    
    warning "Environment variables need to be manually configured"
}

# Post-restore verification
verify_restore() {
    log "Verifying restore..."
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would verify restore"
        return 0
    fi
    
    # Check Convex connection
    if convex function:list &>/dev/null; then
        log "Convex connection verified"
    else
        warning "Could not verify Convex connection"
    fi
    
    # Check S3 access
    if aws s3 ls "s3://${S3_UPLOADS_BUCKET:-pactwise-uploads}" &>/dev/null; then
        log "S3 access verified"
    else
        warning "Could not verify S3 access"
    fi
    
    log "Restore verification completed"
}

# Clean up
cleanup() {
    log "Cleaning up..."
    rm -rf "${RESTORE_DIR}/pactwise-backup-"* 2>/dev/null || true
}

# Main restore process
main() {
    parse_args "$@"
    
    # List backups if requested
    if [ "$LIST_BACKUPS" = true ]; then
        list_backups
        exit 0
    fi
    
    # Check if timestamp is provided
    if [ -z "$TIMESTAMP" ]; then
        error "Timestamp is required. Use --list to see available backups."
        usage
        exit 1
    fi
    
    # Get latest if requested
    if [ "$TIMESTAMP" = "latest" ]; then
        TIMESTAMP=$(get_latest_backup)
        info "Using latest backup: $TIMESTAMP"
    fi
    
    # Confirmation
    if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
        warning "This will restore Pactwise from backup $TIMESTAMP"
        warning "This operation will overwrite existing data!"
        read -p "Are you sure you want to continue? (yes/no) " -n 3 -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Restore cancelled"
            exit 0
        fi
    fi
    
    log "Starting Pactwise restore process..."
    
    # Download backup
    local backup_file=$(download_backup "$TIMESTAMP")
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Decrypt and extract
    local backup_dir=$(decrypt_and_extract "$backup_file")
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Validate backup
    if ! validate_backup "$backup_dir"; then
        exit 1
    fi
    
    # Restore components
    if restore_convex "$backup_dir" && \
       restore_uploaded_files "$backup_dir" && \
       restore_configuration "$backup_dir" && \
       verify_restore; then
        
        log "Restore completed successfully!"
        
        if [ "$DRY_RUN" = false ]; then
            info "Next steps:"
            info "1. Update environment variables in .env.production"
            info "2. Run 'npm install' to install dependencies"
            info "3. Run 'npm run build' to build the application"
            info "4. Deploy the application"
        fi
    else
        error "Restore failed!"
        cleanup
        exit 1
    fi
    
    # Clean up
    cleanup
}

# Run main function
main "$@"