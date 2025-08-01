#!/bin/bash

# Health Check Script for Supabase Deployment
# Usage: ./health-check.sh [environment]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT=10

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"

if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check endpoint health
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        print_color $BLUE "Checking $name..."
        
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "Content-Type: application/json" \
            --max-time $TIMEOUT \
            "$url" || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            print_color $GREEN "✅ $name: OK (HTTP $response)"
            return 0
        elif [ "$response" = "404" ] && [ "$expected_status" = "200" ]; then
            # Some endpoints might not have health checks
            print_color $YELLOW "⚠️  $name: No health endpoint (HTTP 404)"
            return 0
        else
            retries=$((retries + 1))
            if [ $retries -lt $MAX_RETRIES ]; then
                print_color $YELLOW "⚠️  $name: Unhealthy (HTTP $response), retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            else
                print_color $RED "❌ $name: Failed after $MAX_RETRIES attempts (HTTP $response)"
                return 1
            fi
        fi
    done
}

# Function to check database connectivity
check_database() {
    print_color $BLUE "Checking database connectivity..."
    
    # Use supabase CLI to check database
    if supabase db remote list &>/dev/null; then
        print_color $GREEN "✅ Database: Connected"
        return 0
    else
        print_color $RED "❌ Database: Connection failed"
        return 1
    fi
}

# Function to check function health
check_functions() {
    local functions=(
        "auth"
        "contracts"
        "vendors"
        "budgets"
        "ai-analysis"
        "agents"
        "search"
        "notifications"
        "storage"
    )
    
    local all_healthy=true
    
    print_color $BLUE "\n=== Edge Function Health Checks ==="
    
    for func in "${functions[@]}"; do
        if ! check_endpoint "Function: $func" "${SUPABASE_URL}/functions/v1/${func}/health"; then
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        print_color $GREEN "\n✅ All edge functions are healthy"
        return 0
    else
        print_color $RED "\n❌ Some edge functions are unhealthy"
        return 1
    fi
}

# Function to check API endpoints
check_apis() {
    print_color $BLUE "\n=== API Health Checks ==="
    
    local all_healthy=true
    
    # Check REST API
    if ! check_endpoint "REST API" "${SUPABASE_URL}/rest/v1/"; then
        all_healthy=false
    fi
    
    # Check Auth API
    if ! check_endpoint "Auth API" "${SUPABASE_URL}/auth/v1/health"; then
        all_healthy=false
    fi
    
    # Check Storage API
    if ! check_endpoint "Storage API" "${SUPABASE_URL}/storage/v1/health"; then
        all_healthy=false
    fi
    
    # Check Realtime
    if ! check_endpoint "Realtime" "${SUPABASE_URL}/realtime/v1/health"; then
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        print_color $GREEN "\n✅ All API endpoints are healthy"
        return 0
    else
        print_color $RED "\n❌ Some API endpoints are unhealthy"
        return 1
    fi
}

# Function to run performance checks
check_performance() {
    print_color $BLUE "\n=== Performance Checks ==="
    
    # Test a simple query performance
    local start_time=$(date +%s%3N)
    
    response=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/enterprises?select=id&limit=1" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        --max-time $TIMEOUT)
    
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ $response_time -lt 1000 ]; then
        print_color $GREEN "✅ Query Performance: Excellent (${response_time}ms)"
    elif [ $response_time -lt 3000 ]; then
        print_color $YELLOW "⚠️  Query Performance: Good (${response_time}ms)"
    else
        print_color $RED "❌ Query Performance: Poor (${response_time}ms)"
    fi
}

# Function to generate health report
generate_report() {
    local report_file="$PROJECT_ROOT/health-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "checks": {
        "database": "$database_status",
        "functions": "$functions_status",
        "apis": "$apis_status",
        "overall": "$overall_status"
    },
    "url": "${SUPABASE_URL}"
}
EOF
    
    print_color $BLUE "\nHealth report saved to: $report_file"
}

# Main health check process
main() {
    print_color $BLUE "========================================"
    print_color $BLUE "Supabase Health Check"
    print_color $BLUE "Environment: $ENVIRONMENT"
    print_color $BLUE "URL: ${SUPABASE_URL}"
    print_color $BLUE "========================================"
    
    local overall_healthy=true
    local database_status="unknown"
    local functions_status="unknown"
    local apis_status="unknown"
    local overall_status="unknown"
    
    # Run checks
    if check_database; then
        database_status="healthy"
    else
        database_status="unhealthy"
        overall_healthy=false
    fi
    
    if check_apis; then
        apis_status="healthy"
    else
        apis_status="unhealthy"
        overall_healthy=false
    fi
    
    if check_functions; then
        functions_status="healthy"
    else
        functions_status="unhealthy"
        overall_healthy=false
    fi
    
    # Performance check (non-critical)
    check_performance
    
    # Summary
    print_color $BLUE "\n========================================"
    if [ "$overall_healthy" = true ]; then
        overall_status="healthy"
        print_color $GREEN "✅ Overall Status: HEALTHY"
        print_color $GREEN "All systems operational"
    else
        overall_status="unhealthy"
        print_color $RED "❌ Overall Status: UNHEALTHY"
        print_color $RED "Some systems require attention"
    fi
    print_color $BLUE "========================================"
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ "$overall_healthy" = true ]; then
        exit 0
    else
        exit 1
    fi
}

# Check required environment variables
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
    print_color $RED "Error: Required environment variables not set"
    print_color $RED "Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set"
    exit 1
fi

# Run main function
main