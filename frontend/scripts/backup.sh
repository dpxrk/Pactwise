#!/bin/bash

# Pactwise Backup Script
# This script backs up Convex data, uploaded files, and application configuration

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/pactwise"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="pactwise-backup-${TIMESTAMP}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-pactwise-backups}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/pactwise/backup.key}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check for required commands
    for cmd in convex aws openssl tar; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd is not installed"
            exit 1
        fi
    done
    
    # Check for encryption key
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        error "Encryption key not found at $ENCRYPTION_KEY_FILE"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    log "Prerequisites check passed"
}

# Backup Convex data
backup_convex() {
    log "Starting Convex backup..."
    
    local convex_backup_dir="${BACKUP_DIR}/${BACKUP_NAME}/convex"
    mkdir -p "$convex_backup_dir"
    
    # Export Convex data
    if convex export --path "${convex_backup_dir}/convex-data.json"; then
        log "Convex data exported successfully"
        
        # Also backup schema and functions
        cp -r convex/ "${convex_backup_dir}/convex-code/" 2>/dev/null || warning "Could not backup Convex code"
    else
        error "Failed to export Convex data"
        return 1
    fi
}

# Backup uploaded files from S3
backup_uploaded_files() {
    log "Starting uploaded files backup..."
    
    local files_backup_dir="${BACKUP_DIR}/${BACKUP_NAME}/uploads"
    mkdir -p "$files_backup_dir"
    
    # Sync files from S3
    if aws s3 sync "s3://${S3_UPLOADS_BUCKET:-pactwise-uploads}" "$files_backup_dir" \
        --exclude "*.tmp" \
        --exclude "*/temp/*"; then
        log "Uploaded files backed up successfully"
    else
        error "Failed to backup uploaded files"
        return 1
    fi
}

# Backup environment configuration
backup_configuration() {
    log "Backing up configuration..."
    
    local config_backup_dir="${BACKUP_DIR}/${BACKUP_NAME}/config"
    mkdir -p "$config_backup_dir"
    
    # Backup environment variables (excluding secrets)
    env | grep -E '^(NEXT_PUBLIC_|NODE_ENV|VERCEL_)' > "${config_backup_dir}/environment.txt" || true
    
    # Backup application configuration files
    for config_file in \
        .env.production \
        next.config.js \
        package.json \
        package-lock.json \
        tsconfig.json \
        docker-compose.yml \
        k8s/*.yaml; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$config_backup_dir/" 2>/dev/null || warning "Could not backup $config_file"
        fi
    done
    
    log "Configuration backed up"
}

# Create backup metadata
create_metadata() {
    log "Creating backup metadata..."
    
    cat > "${BACKUP_DIR}/${BACKUP_NAME}/metadata.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "version": "$(git describe --tags --always 2>/dev/null || echo 'unknown')",
  "hostname": "$(hostname)",
  "backup_type": "full",
  "components": {
    "convex": true,
    "uploads": true,
    "config": true
  }
}
EOF
}

# Compress and encrypt backup
compress_and_encrypt() {
    log "Compressing and encrypting backup..."
    
    cd "$BACKUP_DIR"
    
    # Create compressed archive
    if tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"; then
        log "Backup compressed successfully"
    else
        error "Failed to compress backup"
        return 1
    fi
    
    # Encrypt the archive
    if openssl enc -aes-256-cbc \
        -salt \
        -in "${BACKUP_NAME}.tar.gz" \
        -out "${BACKUP_NAME}.tar.gz.enc" \
        -pass file:"$ENCRYPTION_KEY_FILE"; then
        log "Backup encrypted successfully"
        
        # Remove unencrypted archive
        rm -f "${BACKUP_NAME}.tar.gz"
    else
        error "Failed to encrypt backup"
        return 1
    fi
    
    # Clean up uncompressed backup
    rm -rf "$BACKUP_NAME"
}

# Upload to S3
upload_to_s3() {
    log "Uploading backup to S3..."
    
    local s3_path="s3://${S3_BACKUP_BUCKET}/${TIMESTAMP}/${BACKUP_NAME}.tar.gz.enc"
    
    if aws s3 cp \
        "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.enc" \
        "$s3_path" \
        --storage-class STANDARD_IA \
        --metadata "backup-type=full,timestamp=${TIMESTAMP}"; then
        log "Backup uploaded to S3 successfully: $s3_path"
        
        # Remove local encrypted backup after successful upload
        rm -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.enc"
    else
        error "Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Clean up local backups older than 7 days
    find "$BACKUP_DIR" -name "pactwise-backup-*.tar.gz.enc" -mtime +7 -delete 2>/dev/null || true
    
    # Clean up S3 backups older than retention period
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    
    aws s3 ls "s3://${S3_BACKUP_BUCKET}/" | while read -r line; do
        local backup_date=$(echo "$line" | awk '{print $1}')
        if [[ "$backup_date" < "$cutoff_date" ]]; then
            local backup_prefix=$(echo "$line" | awk '{print $2}')
            aws s3 rm "s3://${S3_BACKUP_BUCKET}/${backup_prefix}" --recursive
            log "Deleted old backup: ${backup_prefix}"
        fi
    done
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send to monitoring system
    if [ -n "${MONITORING_WEBHOOK:-}" ]; then
        curl -X POST "$MONITORING_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"backup\",
                \"status\": \"$status\",
                \"timestamp\": \"$TIMESTAMP\",
                \"message\": \"$message\"
            }" 2>/dev/null || true
    fi
    
    # Log to syslog
    logger -t pactwise-backup "$status: $message"
}

# Main backup process
main() {
    log "Starting Pactwise backup process..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    if backup_convex && \
       backup_uploaded_files && \
       backup_configuration && \
       create_metadata && \
       compress_and_encrypt && \
       upload_to_s3; then
        
        # Clean up old backups
        cleanup_old_backups
        
        log "Backup completed successfully!"
        send_notification "success" "Backup completed: ${BACKUP_NAME}"
        exit 0
    else
        error "Backup failed!"
        send_notification "failure" "Backup failed: ${BACKUP_NAME}"
        
        # Clean up failed backup
        rm -rf "${BACKUP_DIR}/${BACKUP_NAME}" 2>/dev/null || true
        rm -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" 2>/dev/null || true
        rm -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.enc" 2>/dev/null || true
        
        exit 1
    fi
}

# Run main function
main "$@"