#!/bin/bash

# Supabase Deployment Script
# Usage: ./deploy.sh [environment] [options]

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
SUPABASE_CLI_VERSION="1.131.0"

# Default values
ENVIRONMENT=""
RUN_MIGRATIONS=true
DEPLOY_FUNCTIONS=true
UPDATE_SECRETS=true
VERIFY_JWT=true
DRY_RUN=false

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <environment> [options]

Environments:
    development     Deploy to development environment
    staging        Deploy to staging environment
    production     Deploy to production environment

Options:
    --no-migrations      Skip database migrations
    --no-functions       Skip edge function deployment
    --no-secrets         Skip secret updates
    --no-verify-jwt      Disable JWT verification for functions
    --dry-run           Perform a dry run without actual deployment
    -h, --help          Show this help message

Examples:
    $0 staging
    $0 production --dry-run
    $0 development --no-migrations

EOF
}

# Parse arguments
if [ $# -eq 0 ]; then
    usage
    exit 1
fi

ENVIRONMENT=$1
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-migrations)
            RUN_MIGRATIONS=false
            shift
            ;;
        --no-functions)
            DEPLOY_FUNCTIONS=false
            shift
            ;;
        --no-secrets)
            UPDATE_SECRETS=false
            shift
            ;;
        --no-verify-jwt)
            VERIFY_JWT=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
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
    development|staging|production)
        ;;
    *)
        print_color $RED "Invalid environment: $ENVIRONMENT"
        usage
        exit 1
        ;;
esac

# Load environment configuration
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
    print_color $BLUE "Loading environment variables from $ENV_FILE"
    source "$ENV_FILE"
else
    print_color $YELLOW "Warning: $ENV_FILE not found"
fi

# Check required environment variables
check_env_vars() {
    local required_vars=(
        "SUPABASE_ACCESS_TOKEN"
        "SUPABASE_PROJECT_ID"
    )
    
    if [ "$RUN_MIGRATIONS" = true ]; then
        required_vars+=("SUPABASE_DB_PASSWORD")
    fi
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            print_color $RED "Error: $var is not set"
            exit 1
        fi
    done
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_color $YELLOW "Supabase CLI not found. Installing..."
        curl -L "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz" | tar xz
        sudo mv supabase /usr/local/bin/
    fi
    
    print_color $GREEN "Supabase CLI version: $(supabase --version)"
}

# Link to Supabase project
link_project() {
    print_color $BLUE "Linking to Supabase project..."
    supabase link --project-ref "$SUPABASE_PROJECT_ID"
}

# Create deployment backup
create_backup() {
    if [ "$DRY_RUN" = true ]; then
        print_color $YELLOW "DRY RUN: Would create backup"
        return
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_color $BLUE "Creating pre-deployment backup..."
        local timestamp=$(date +%Y%m%d-%H%M%S)
        local backup_file="backup-${ENVIRONMENT}-${timestamp}.sql"
        
        supabase db dump -f "$backup_file" --data-only=false
        
        if [ -f "$backup_file" ]; then
            gzip "$backup_file"
            print_color $GREEN "Backup created: ${backup_file}.gz"
        else
            print_color $RED "Failed to create backup"
            exit 1
        fi
    fi
}

# Run database migrations
run_migrations() {
    if [ "$RUN_MIGRATIONS" = false ]; then
        print_color $YELLOW "Skipping database migrations"
        return
    fi
    
    print_color $BLUE "Running database migrations..."
    
    if [ "$DRY_RUN" = true ]; then
        print_color $YELLOW "DRY RUN: Showing migration diff"
        supabase db diff --linked
    else
        # Check for pending migrations
        if supabase db diff --linked | grep -q "No changes"; then
            print_color $GREEN "No pending migrations"
        else
            supabase db push --include-all
            print_color $GREEN "Migrations applied successfully"
        fi
    fi
}

# Update secrets
update_secrets() {
    if [ "$UPDATE_SECRETS" = false ]; then
        print_color $YELLOW "Skipping secret updates"
        return
    fi
    
    print_color $BLUE "Updating function secrets..."
    
    if [ "$DRY_RUN" = true ]; then
        print_color $YELLOW "DRY RUN: Would update secrets"
        return
    fi
    
    # Base secrets
    local secrets=(
        "SUPABASE_URL=${SUPABASE_URL}"
        "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}"
        "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"
    )
    
    # Add environment-specific secrets
    case $ENVIRONMENT in
        production)
            secrets+=(
                "OPENAI_API_KEY=${OPENAI_API_KEY}"
                "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}"
                "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}"
                "REDIS_URL=${REDIS_URL}"
                "RESEND_API_KEY=${RESEND_API_KEY}"
                "SENTRY_DSN=${SENTRY_DSN}"
                "LOG_LEVEL=info"
                "ENABLE_TRACING=true"
                "ENVIRONMENT=production"
            )
            ;;
        staging)
            secrets+=(
                "OPENAI_API_KEY=${OPENAI_API_KEY}"
                "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}"
                "REDIS_URL=${REDIS_URL}"
                "RESEND_API_KEY=${RESEND_API_KEY}"
                "LOG_LEVEL=debug"
                "ENABLE_TRACING=true"
                "ENVIRONMENT=staging"
            )
            ;;
        *)
            secrets+=(
                "LOG_LEVEL=debug"
                "ENABLE_TRACING=false"
                "ENVIRONMENT=development"
            )
            ;;
    esac
    
    # Set secrets
    supabase secrets set "${secrets[@]}"
    print_color $GREEN "Secrets updated successfully"
}

# Deploy edge functions
deploy_functions() {
    if [ "$DEPLOY_FUNCTIONS" = false ]; then
        print_color $YELLOW "Skipping edge function deployment"
        return
    fi
    
    print_color $BLUE "Deploying edge functions..."
    
    if [ "$DRY_RUN" = true ]; then
        print_color $YELLOW "DRY RUN: Would deploy functions"
        # List functions that would be deployed
        ls -d "$PROJECT_ROOT/supabase/functions"/*/ | grep -v _shared | while read -r func_dir; do
            func_name=$(basename "$func_dir")
            print_color $YELLOW "  - $func_name"
        done
        return
    fi
    
    # Deploy options
    local deploy_opts=""
    if [ "$VERIFY_JWT" = true ]; then
        deploy_opts="--verify-jwt"
    fi
    
    # Deploy all functions
    supabase functions deploy $deploy_opts
    
    # List deployed functions
    print_color $GREEN "Deployed functions:"
    supabase functions list
}

# Run health checks
run_health_checks() {
    print_color $BLUE "Running health checks..."
    
    local health_script="$SCRIPT_DIR/health-check.sh"
    if [ -x "$health_script" ]; then
        "$health_script" "$ENVIRONMENT"
    else
        print_color $YELLOW "Health check script not found, skipping"
    fi
}

# Main deployment process
main() {
    print_color $BLUE "========================================"
    print_color $BLUE "Supabase Deployment Script"
    print_color $BLUE "Environment: $ENVIRONMENT"
    print_color $BLUE "Dry Run: $DRY_RUN"
    print_color $BLUE "========================================"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Pre-deployment checks
    check_env_vars
    check_supabase_cli
    link_project
    
    # Create backup for production
    create_backup
    
    # Deployment steps
    run_migrations
    update_secrets
    deploy_functions
    
    # Post-deployment
    if [ "$DRY_RUN" = false ]; then
        run_health_checks
    fi
    
    print_color $GREEN "========================================"
    print_color $GREEN "Deployment completed successfully!"
    print_color $GREEN "========================================"
}

# Run main function
main

exit 0