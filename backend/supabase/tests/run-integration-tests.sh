#!/bin/bash

# Run multi-agent workflow integration tests

echo "🧪 Running Multi-Agent Workflow Integration Tests"
echo "================================================"

# Set environment variables for test database
export DATABASE_URL=${TEST_DATABASE_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}
export SUPABASE_URL=${TEST_SUPABASE_URL:-"http://localhost:54321"}
export SUPABASE_ANON_KEY=${TEST_SUPABASE_ANON_KEY:-"your-anon-key"}
export SUPABASE_SERVICE_ROLE_KEY=${TEST_SUPABASE_SERVICE_ROLE_KEY:-"your-service-role-key"}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a specific test suite
run_test_suite() {
    local test_file=$1
    local test_name=$2
    
    echo -e "\n${YELLOW}Running: ${test_name}${NC}"
    echo "----------------------------------------"
    
    if npm test "$test_file"; then
        echo -e "${GREEN}✓ ${test_name} passed${NC}"
        return 0
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        return 1
    fi
}

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run individual test suites
test_suites=(
    "multi-agent-workflows.test.ts:Multi-Agent Workflow Integration Tests"
    "agent-coordination.test.ts:Agent Coordination and Communication Tests"
    "agent-scenarios.test.ts:Real-World Agent Scenarios"
    "agent-tasks-performance.test.ts:Agent Tasks Performance Tests"
)

for suite in "${test_suites[@]}"; do
    IFS=':' read -r file name <<< "$suite"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if run_test_suite "$file" "$name"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
done

# Summary
echo -e "\n================================================"
echo "📊 Test Summary"
echo "================================================"
echo -e "Total test suites: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

# Run all tests with coverage if requested
if [ "$1" == "--coverage" ]; then
    echo -e "\n${YELLOW}Running all tests with coverage...${NC}"
    npm test -- --coverage --reporter=text --reporter=html
fi

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    echo -e "\n${GREEN}All integration tests passed! 🎉${NC}"
    exit 0
fi