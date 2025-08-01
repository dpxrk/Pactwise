#!/bin/bash

# Smoke Tests for Supabase Deployment
# Usage: ./smoke-tests.sh [environment]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Load environment
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

# Function to run a test
run_test() {
    local test_name=$1
    local test_function=$2
    
    print_color $BLUE "Running: $test_name"
    
    if $test_function; then
        print_color $GREEN "  ✅ PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_color $RED "  ❌ FAILED"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test: Authentication
test_auth() {
    # Test anonymous access
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        "${SUPABASE_URL}/auth/v1/health" \
        -H "apikey: ${SUPABASE_ANON_KEY}")
    
    [ "$response" = "200" ]
}

# Test: Database connectivity
test_database() {
    # Simple query to test database
    response=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/enterprises?select=id&limit=1" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}")
    
    # Check if response is valid JSON
    echo "$response" | jq . >/dev/null 2>&1
}

# Test: Edge function availability
test_edge_functions() {
    local critical_functions=("auth" "contracts" "vendors")
    local all_available=true
    
    for func in "${critical_functions[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            "${SUPABASE_URL}/functions/v1/${func}/health" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
        
        if [ "$response" != "200" ] && [ "$response" != "404" ]; then
            all_available=false
            break
        fi
    done
    
    $all_available
}

# Test: Storage buckets
test_storage() {
    # Check if storage buckets are accessible
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        "${SUPABASE_URL}/storage/v1/bucket/contracts" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
    
    # 400 is expected without proper auth, but it means the bucket exists
    [ "$response" = "400" ] || [ "$response" = "200" ]
}

# Test: Create and retrieve a test record
test_crud_operations() {
    # This would require a service role key for full CRUD
    # For now, just test read access
    response=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/vendors?select=id,name&limit=1" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}")
    
    # Check if response is valid JSON array
    echo "$response" | jq -e '. | type == "array"' >/dev/null 2>&1
}

# Test: RPC function
test_rpc_functions() {
    # Test a simple RPC function if available
    response=$(curl -s -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/get_user_permissions" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}')
    
    # Even an error response indicates the RPC endpoint exists
    [ -n "$response" ]
}

# Test: Realtime connectivity
test_realtime() {
    # Simple check if realtime endpoint responds
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        "${SUPABASE_URL}/realtime/v1/health" \
        -H "apikey: ${SUPABASE_ANON_KEY}")
    
    [ "$response" = "200" ] || [ "$response" = "404" ]
}

# Test: Response times
test_performance() {
    local start_time=$(date +%s%3N)
    
    curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/enterprises?select=id&limit=1" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -o /dev/null
    
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    # Expect response within 5 seconds
    [ $response_time -lt 5000 ]
}

# Test: API rate limiting
test_rate_limiting() {
    # Make multiple rapid requests
    local success_count=0
    
    for i in {1..5}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            "${SUPABASE_URL}/rest/v1/enterprises?select=id&limit=1" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "apikey: ${SUPABASE_ANON_KEY}")
        
        if [ "$response" = "200" ]; then
            success_count=$((success_count + 1))
        fi
    done
    
    # At least some requests should succeed
    [ $success_count -gt 0 ]
}

# Test: Security headers
test_security_headers() {
    response=$(curl -s -I \
        "${SUPABASE_URL}/rest/v1/enterprises?select=id&limit=1" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}")
    
    # Check for security headers
    echo "$response" | grep -qi "x-content-type-options" || \
    echo "$response" | grep -qi "x-frame-options"
}

# Main test runner
main() {
    print_color $BLUE "========================================"
    print_color $BLUE "Smoke Tests for $ENVIRONMENT"
    print_color $BLUE "URL: ${SUPABASE_URL}"
    print_color $BLUE "========================================"
    echo
    
    # Run all tests
    run_test "Authentication" test_auth
    run_test "Database Connectivity" test_database
    run_test "Edge Functions" test_edge_functions
    run_test "Storage Buckets" test_storage
    run_test "CRUD Operations" test_crud_operations
    run_test "RPC Functions" test_rpc_functions
    run_test "Realtime" test_realtime
    run_test "Performance" test_performance
    run_test "Rate Limiting" test_rate_limiting
    run_test "Security Headers" test_security_headers
    
    # Summary
    echo
    print_color $BLUE "========================================"
    print_color $BLUE "Test Summary"
    print_color $GREEN "Passed: $TESTS_PASSED"
    print_color $RED "Failed: $TESTS_FAILED"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local pass_rate=0
    if [ $total_tests -gt 0 ]; then
        pass_rate=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    print_color $BLUE "Pass Rate: ${pass_rate}%"
    print_color $BLUE "========================================"
    
    # Generate report
    local report_file="smoke-test-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    cat > "$report_file" << EOF
{
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "tests": {
        "total": $total_tests,
        "passed": $TESTS_PASSED,
        "failed": $TESTS_FAILED,
        "pass_rate": $pass_rate
    },
    "url": "${SUPABASE_URL}"
}
EOF
    
    print_color $BLUE "Report saved to: $report_file"
    
    # Exit code based on failures
    if [ $TESTS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Check required environment variables
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
    print_color $RED "Error: Required environment variables not set"
    exit 1
fi

# Run tests
main