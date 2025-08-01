#!/bin/bash

# Rollback Script for Supabase Deployment
# Usage: ./rollback.sh [environment] [backup-file|commit-hash] [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT=""
ROLLBACK_TARGET=""
ROLLBACK_DATABASE=true
ROLLBACK_FUNCTIONS=true
FORCE=false

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <environment> <target> [options]

Arguments:
    environment     Environment to rollback (staging|production)
    target         Backup file path, S3 URL, or git commit hash

Options:
    --no-database       Skip database rollback
    --no-functions      Skip function rollback
    --force            Force rollback without confirmation
    -h, --help         Show this help message

Examples:
    $0 production backup-production-20240101-120000.sql.gz
    $0 staging s3://bucket/backups/staging/backup.sql.gz
    $0 production abc123def --no-database

EOF
}

# Parse arguments
if [ $# -lt 2 ]; then
    usage
    exit 1
fi

ENVIRONMENT=$1
ROLLBACK_TARGET=$2
shift 2

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-database)
            ROLLBACK_DATABASE=false
            shift
            ;;
        --no-functions)
            ROLLBACK_FUNCTIONS=false
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_color $RED "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    staging|production)
        ;;
    *)
        print_color $RED "Invalid environment: $ENVIRONMENT"
        print_color $RED "Rollback is only available for staging and production"
        exit 1
        ;;
esac

# Load environment configuration
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    print_color $RED "Error: $ENV_FILE not found"
    exit 1
fi

# Confirmation prompt
confirm_rollback() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    print_color $YELLOW "⚠️  WARNING: You are about to rollback $ENVIRONMENT environment"
    print_color $YELLOW "Target: $ROLLBACK_TARGET"
    print_color $YELLOW "This action cannot be undone!"
    echo
    read -p "Type 'ROLLBACK $ENVIRONMENT' to confirm: " confirmation
    
    if [ "$confirmation" != "ROLLBACK $ENVIRONMENT" ]; then
        print_color $RED "Rollback cancelled"
        exit 1
    fi
}

# Create pre-rollback backup
create_safety_backup() {
    print_color $BLUE "Creating safety backup before rollback..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="pre-rollback-${ENVIRONMENT}-${timestamp}.sql"
    
    supabase db dump -f "$backup_file" --data-only=false
    
    if [ -f "$backup_file" ]; then
        gzip "$backup_file"
        print_color $GREEN "Safety backup created: ${backup_file}.gz"
        
        # Upload to S3 if configured
        if [ -n "${AWS_BACKUP_BUCKET:-}" ]; then
            aws s3 cp "${backup_file}.gz" \
                "s3://${AWS_BACKUP_BUCKET}/rollbacks/${ENVIRONMENT}/${backup_file}.gz"
            print_color $GREEN "Safety backup uploaded to S3"
        fi
    else
        print_color $RED "Failed to create safety backup"
        exit 1
    fi
}

# Determine rollback type
determine_rollback_type() {
    if [[ "$ROLLBACK_TARGET" =~ \.sql(\.gz)?$ ]]; then
        echo "database_backup"
    elif [[ "$ROLLBACK_TARGET" =~ ^s3:// ]]; then
        echo "s3_backup"
    elif [[ "$ROLLBACK_TARGET" =~ ^[a-f0-9]{6,40}$ ]]; then
        echo "git_commit"
    else
        print_color $RED "Unable to determine rollback type for: $ROLLBACK_TARGET"
        exit 1
    fi
}

# Download backup from S3
download_s3_backup() {
    local s3_url=$1
    local local_file="rollback-backup.sql.gz"
    
    print_color $BLUE "Downloading backup from S3..."
    
    if aws s3 cp "$s3_url" "$local_file"; then
        print_color $GREEN "Backup downloaded successfully"
        echo "$local_file"
    else
        print_color $RED "Failed to download backup from S3"
        exit 1
    fi
}

# Rollback database
rollback_database() {
    if [ "$ROLLBACK_DATABASE" = false ]; then
        print_color $YELLOW "Skipping database rollback"
        return
    fi
    
    local backup_file=""
    local rollback_type=$(determine_rollback_type)
    
    case $rollback_type in
        database_backup)
            backup_file="$ROLLBACK_TARGET"
            ;;
        s3_backup)
            backup_file=$(download_s3_backup "$ROLLBACK_TARGET")
            ;;
        git_commit)
            print_color $YELLOW "Git commit rollback does not restore database data"
            return
            ;;
    esac
    
    print_color $BLUE "Rolling back database from: $backup_file"
    
    # Decompress if needed
    if [[ "$backup_file" =~ \.gz$ ]]; then
        print_color $BLUE "Decompressing backup..."
        gunzip -k "$backup_file"
        backup_file="${backup_file%.gz}"
    fi
    
    # Verify backup file
    if [ ! -f "$backup_file" ]; then
        print_color $RED "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Get database URL
    DB_URL=$(supabase db url --linked)
    
    # Restore database
    print_color $BLUE "Restoring database..."
    
    # Drop existing schema and restore
    if [[ "$backup_file" =~ \.sql$ ]]; then
        # Plain SQL file
        psql "$DB_URL" < "$backup_file"
    else
        # Custom format backup
        pg_restore --clean --if-exists --no-owner --no-privileges -d "$DB_URL" "$backup_file"
    fi
    
    print_color $GREEN "Database restored successfully"
}

# Rollback functions to git commit
rollback_functions() {
    if [ "$ROLLBACK_FUNCTIONS" = false ]; then
        print_color $YELLOW "Skipping function rollback"
        return
    fi
    
    local rollback_type=$(determine_rollback_type)
    
    if [ "$rollback_type" != "git_commit" ]; then
        print_color $YELLOW "Function rollback only available for git commits"
        return
    fi
    
    print_color $BLUE "Rolling back functions to commit: $ROLLBACK_TARGET"
    
    # Checkout the specific commit
    cd "$PROJECT_ROOT"
    git fetch --all
    
    # Create a temporary branch for rollback
    local temp_branch="rollback-${ENVIRONMENT}-$(date +%s)"
    git checkout -b "$temp_branch" "$ROLLBACK_TARGET"
    
    # Deploy functions from this commit
    supabase functions deploy --verify-jwt
    
    # Return to original branch
    git checkout -
    git branch -D "$temp_branch"
    
    print_color $GREEN "Functions rolled back successfully"
}

# Verify rollback
verify_rollback() {
    print_color $BLUE "Verifying rollback..."
    
    # Run health checks
    local health_script="$SCRIPT_DIR/health-check.sh"
    if [ -x "$health_script" ]; then
        "$health_script" "$ENVIRONMENT"
    fi
}

# Create rollback record
record_rollback() {
    local rollback_record="rollback-record-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$rollback_record" << EOF
{
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "target": "$ROLLBACK_TARGET",
    "type": "$(determine_rollback_type)",
    "performed_by": "${USER}",
    "database_rollback": $ROLLBACK_DATABASE,
    "functions_rollback": $ROLLBACK_FUNCTIONS,
    "success": true
}
EOF
    
    print_color $BLUE "Rollback record saved: $rollback_record"
    
    # Upload to S3 if configured
    if [ -n "${AWS_BACKUP_BUCKET:-}" ]; then
        aws s3 cp "$rollback_record" \
            "s3://${AWS_BACKUP_BUCKET}/rollbacks/${ENVIRONMENT}/records/$rollback_record"
    fi
}

# Main rollback process
main() {
    print_color $RED "========================================"
    print_color $RED "🚨 ROLLBACK PROCEDURE 🚨"
    print_color $RED "Environment: $ENVIRONMENT"
    print_color $RED "Target: $ROLLBACK_TARGET"
    print_color $RED "========================================"
    
    # Confirmation
    confirm_rollback
    
    # Link to project
    cd "$PROJECT_ROOT"
    supabase link --project-ref "$SUPABASE_PROJECT_ID"
    
    # Create safety backup
    create_safety_backup
    
    # Perform rollback
    local start_time=$(date +%s)
    
    rollback_database
    rollback_functions
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Verify rollback
    verify_rollback
    
    # Record rollback
    record_rollback
    
    print_color $GREEN "========================================"
    print_color $GREEN "✅ Rollback completed successfully"
    print_color $GREEN "Duration: ${duration} seconds"
    print_color $GREEN "========================================"
    
    # Send notification
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"🚨 Rollback completed for $ENVIRONMENT\",
                \"attachments\": [{
                    \"color\": \"warning\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Target\", \"value\": \"$ROLLBACK_TARGET\", \"short\": true},
                        {\"title\": \"Duration\", \"value\": \"${duration}s\", \"short\": true},
                        {\"title\": \"Performed by\", \"value\": \"${USER}\", \"short\": true}
                    ]
                }]
            }"
    fi
}

# Check required tools
check_required_tools() {
    local required_tools=("supabase" "psql" "pg_restore" "git")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_color $RED "Error: $tool is not installed"
            exit 1
        fi
    done
}

# Run checks
check_required_tools

# Run main function
main

exit 0