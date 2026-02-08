#!/bin/bash

# Swarm Orchestration Test Script
# Tests all swarm modes and validates database integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="http://127.0.0.1:54321"
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Default JWT token (you'll need to replace this with actual token)
JWT_TOKEN="${SUPABASE_JWT_TOKEN:-YOUR_JWT_TOKEN_HERE}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Swarm Orchestration Integration Test Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "1. Checking Prerequisites"

    # Check if Supabase is running
    echo -n "Checking Supabase status... "
    if curl -s "${SUPABASE_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not running${NC}"
        echo -e "${YELLOW}Please start Supabase: cd backend && supabase start${NC}"
        exit 1
    fi

    # Check if JWT token is set
    echo -n "Checking JWT token... "
    if [ "$JWT_TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
        echo -e "${YELLOW}⚠ Not configured${NC}"
        echo -e "${YELLOW}Set SUPABASE_JWT_TOKEN environment variable${NC}"
        echo -e "${YELLOW}For testing, you can get a token from: http://127.0.0.1:54323${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Configured${NC}"
    fi

    # Check if swarm tables exist (if psql is available)
    if command -v psql > /dev/null 2>&1; then
        echo -n "Checking swarm tables... "
        TABLE_COUNT=$(psql "${DB_URL}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'agent_%'" 2>/dev/null || echo "0")

        if [ "$TABLE_COUNT" -ge 3 ]; then
            echo -e "${GREEN}✓ Found ${TABLE_COUNT} tables${NC}"
        else
            echo -e "${YELLOW}⚠ Found ${TABLE_COUNT} tables (expected 3+)${NC}"
            echo -e "${YELLOW}Migration 139 may not be applied${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ psql not available, skipping table check${NC}"
    fi
}

# Function to test endpoint
test_endpoint() {
    local test_name=$1
    local swarm_mode=$2
    local config=$3

    echo -e "\n${YELLOW}Testing: ${test_name}${NC}"

    local payload
    if [ "$swarm_mode" = "false" ]; then
        payload='{
            "agentType": "manager",
            "data": {
                "content": "Review contract ABC-123 for legal compliance and financial impact"
            },
            "context": {
                "metadata": {
                    "executionMode": "synchronous"
                }
            }
        }'
    else
        payload='{
            "agentType": "manager",
            "data": {
                "content": "URGENT: Analyze vendor contract DEF-456 for legal, financial, and compliance risks"
            },
            "context": {
                "metadata": {
                    "swarmMode": true,
                    "swarmConfig": '"${config}"',
                    "executionMode": "synchronous"
                }
            }
        }'
    fi

    echo "Request payload:"
    echo "$payload" | jq '.' 2>/dev/null || echo "$payload"

    echo -e "\nSending request..."
    response=$(curl -s -w "\n%{http_code}" \
        -X POST "${FUNCTIONS_URL}/local-agents/process" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$payload")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    echo -e "\nHTTP Status: ${http_code}"

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Request successful${NC}"

        # Parse response for key indicators
        echo -e "\nResponse analysis:"

        # Check for swarm indicators
        if echo "$body" | jq -e '.rulesApplied[]? | select(. == "swarm_orchestration_enabled")' > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Swarm orchestration enabled${NC}"
        else
            if [ "$swarm_mode" = "true" ]; then
                echo -e "  ${RED}✗ Swarm orchestration NOT enabled (expected)${NC}"
            else
                echo -e "  ${GREEN}✓ Traditional orchestration (as expected)${NC}"
            fi
        fi

        # Check swarmOptimized flag
        swarm_optimized=$(echo "$body" | jq -r '.data.swarmOptimized // false' 2>/dev/null)
        if [ "$swarm_optimized" = "true" ]; then
            echo -e "  ${GREEN}✓ Swarm optimization active${NC}"
        fi

        # Check consensus
        consensus=$(echo "$body" | jq -r '.data.aggregatedData.consensusReached // false' 2>/dev/null)
        if [ "$consensus" = "true" ]; then
            consensus_score=$(echo "$body" | jq -r '.data.aggregatedData.consensusScore // 0' 2>/dev/null)
            echo -e "  ${GREEN}✓ Consensus reached (score: ${consensus_score})${NC}"
        fi

        # Show full response
        echo -e "\nFull response:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"

    else
        echo -e "${RED}✗ Request failed${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Function to verify database state
verify_database() {
    if ! command -v psql > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ psql not available, skipping database verification${NC}"
        return
    fi

    print_header "4. Database Verification"

    echo -e "\n${YELLOW}Agent Performance History:${NC}"
    psql "${DB_URL}" -c "
        SELECT
            agent_type,
            COUNT(*) as executions,
            ROUND(AVG(confidence)::numeric, 2) as avg_confidence,
            ROUND(AVG(duration_ms)::numeric, 0) as avg_duration_ms
        FROM agent_performance_history
        WHERE executed_at > NOW() - INTERVAL '1 hour'
        GROUP BY agent_type
        ORDER BY agent_type;
    " 2>/dev/null || echo "No data or table doesn't exist"

    echo -e "\n${YELLOW}Pheromone Trails:${NC}"
    psql "${DB_URL}" -c "
        SELECT
            field_id,
            pheromone_type,
            position->>'agentSequence' as sequence,
            strength,
            reinforcement_count
        FROM agent_pheromones
        WHERE deposited_at > NOW() - INTERVAL '1 hour'
        ORDER BY strength DESC
        LIMIT 10;
    " 2>/dev/null || echo "No data or table doesn't exist"

    echo -e "\n${YELLOW}Learned Patterns:${NC}"
    psql "${DB_URL}" -c "
        SELECT
            pattern_type,
            name,
            agent_sequence,
            ROUND(success_rate::numeric, 2) as success_rate,
            usage_count
        FROM agent_swarm_patterns
        ORDER BY success_rate DESC, usage_count DESC
        LIMIT 5;
    " 2>/dev/null || echo "No data or table doesn't exist"
}

# Main test execution
main() {
    # Prerequisites
    check_prerequisites

    # Test 1: Baseline (Traditional Mode)
    print_header "2. Test 1: Baseline (Traditional Mode)"
    test_endpoint "Traditional Orchestration" "false" ""

    # Test 2: Full Swarm Mode
    print_header "3. Test 2: Full Swarm Mode"
    full_config='{
        "agentSelectionEnabled": true,
        "workflowOptimizationEnabled": true,
        "consensusEnabled": true,
        "patternLearningEnabled": true,
        "algorithm": "pso",
        "optimizationTimeout": 100,
        "consensusThreshold": 0.66
    }'
    test_endpoint "Full Swarm Orchestration" "true" "$full_config"

    # Test 3: Partial Swarm (Agent Selection Only)
    print_header "3. Test 3: Partial Swarm (Agent Selection Only)"
    partial_config='{
        "agentSelectionEnabled": true,
        "workflowOptimizationEnabled": false,
        "consensusEnabled": false,
        "patternLearningEnabled": false
    }'
    test_endpoint "PSO Agent Selection Only" "true" "$partial_config"

    # Verify database state
    verify_database

    # Summary
    print_header "Test Summary"
    echo -e "${GREEN}✓ All tests completed${NC}"
    echo -e "\nNext steps:"
    echo -e "  1. Review the responses above for swarm indicators"
    echo -e "  2. Check database tables for performance data and pheromones"
    echo -e "  3. Run multiple similar requests to trigger pattern learning"
    echo -e "  4. Monitor swarm optimization effectiveness"
    echo ""
    echo -e "For detailed analysis, visit Supabase Studio:"
    echo -e "  ${BLUE}http://127.0.0.1:54323${NC}"
}

# Run main function
main
