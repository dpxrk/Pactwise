#!/bin/bash

# Pactwise Load Testing Script
# This script runs k6 load tests against the Pactwise application

set -euo pipefail

# Configuration
K6_CLOUD_TOKEN="${K6_CLOUD_TOKEN:-}"
BASE_URL="${BASE_URL:-https://app.pactwise.com}"
API_TOKEN="${API_TOKEN:-}"
OUTPUT_DIR="./load-test-results"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to print colored output
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    error "k6 is not installed. Please install k6 first."
    echo "Installation instructions: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Show usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
    -s, --scenario SCENARIO    Run specific scenario (smoke, load, stress, spike, all)
    -u, --url URL             Base URL to test (default: $BASE_URL)
    -t, --token TOKEN         API token for authentication
    -o, --output FORMAT       Output format (json, csv, cloud)
    -d, --duration DURATION   Override test duration
    -v, --vus NUMBER         Override virtual users
    -h, --help               Show this help message

Examples:
    $0 --scenario smoke                    # Run smoke test
    $0 --scenario load --url http://localhost:3000
    $0 --scenario all --output cloud       # Run all tests and upload to k6 cloud
EOF
}

# Parse command line arguments
SCENARIO="load"
OUTPUT_FORMAT="json"
DURATION=""
VUS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--scenario)
            SCENARIO="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -t|--token)
            API_TOKEN="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -v|--vus)
            VUS="$2"
            shift 2
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

# Validate scenario
case $SCENARIO in
    smoke|load|stress|spike|all)
        ;;
    *)
        error "Invalid scenario: $SCENARIO"
        echo "Valid scenarios: smoke, load, stress, spike, all"
        exit 1
        ;;
esac

# Build k6 command
K6_CMD="k6 run"

# Add output format
case $OUTPUT_FORMAT in
    json)
        K6_CMD="$K6_CMD --out json=$OUTPUT_DIR/results-$(date +%Y%m%d-%H%M%S).json"
        ;;
    csv)
        K6_CMD="$K6_CMD --out csv=$OUTPUT_DIR/results-$(date +%Y%m%d-%H%M%S).csv"
        ;;
    cloud)
        if [ -z "$K6_CLOUD_TOKEN" ]; then
            error "K6_CLOUD_TOKEN is required for cloud output"
            exit 1
        fi
        K6_CMD="$K6_CMD --out cloud"
        ;;
esac

# Add environment variables
K6_CMD="$K6_CMD -e BASE_URL=$BASE_URL"

if [ -n "$API_TOKEN" ]; then
    K6_CMD="$K6_CMD -e API_TOKEN=$API_TOKEN"
fi

# Add scenario-specific options
if [ "$SCENARIO" != "all" ]; then
    K6_CMD="$K6_CMD --scenario=$SCENARIO"
fi

# Add duration override
if [ -n "$DURATION" ]; then
    K6_CMD="$K6_CMD --duration=$DURATION"
fi

# Add VUs override
if [ -n "$VUS" ]; then
    K6_CMD="$K6_CMD --vus=$VUS"
fi

# Add the test file
K6_CMD="$K6_CMD k6/load-test.js"

# Run the test
log "Starting load test..."
log "Scenario: $SCENARIO"
log "Target URL: $BASE_URL"
log "Output format: $OUTPUT_FORMAT"

if [ "$SCENARIO" == "all" ]; then
    warning "Running all scenarios. This will take approximately 90 minutes."
fi

# Execute k6
if $K6_CMD; then
    log "Load test completed successfully!"
    
    # Generate summary report
    if [ "$OUTPUT_FORMAT" == "json" ]; then
        log "Generating summary report..."
        
        # Find the latest results file
        LATEST_RESULTS=$(ls -t "$OUTPUT_DIR"/results-*.json | head -1)
        
        if [ -n "$LATEST_RESULTS" ]; then
            # Generate HTML report
            node -e "
                const fs = require('fs');
                const data = JSON.parse(fs.readFileSync('$LATEST_RESULTS', 'utf8'));
                
                const html = \`
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Results - \${new Date().toISOString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metric { margin: 10px 0; }
        .passed { color: green; }
        .failed { color: red; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Pactwise Load Test Results</h1>
    <div class='summary'>
        <h2>Test Summary</h2>
        <p><strong>Scenario:</strong> $SCENARIO</p>
        <p><strong>Target URL:</strong> $BASE_URL</p>
        <p><strong>Test Duration:</strong> \${Math.round(data.state.testRunDurationMs / 1000)}s</p>
        <p><strong>Total Requests:</strong> \${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}</p>
    </div>
    
    <h2>Performance Metrics</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Status</th>
        </tr>
        <tr>
            <td>Average Response Time</td>
            <td>\${Math.round(data.metrics.http_req_duration.values.avg)}ms</td>
            <td class='\${data.metrics.http_req_duration.values.avg < 500 ? \"passed\" : \"failed\"}'>
                \${data.metrics.http_req_duration.values.avg < 500 ? \"PASS\" : \"FAIL\"}
            </td>
        </tr>
        <tr>
            <td>95th Percentile Response Time</td>
            <td>\${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</td>
            <td class='\${data.metrics.http_req_duration.values['p(95)'] < 1000 ? \"passed\" : \"failed\"}'>
                \${data.metrics.http_req_duration.values['p(95)'] < 1000 ? \"PASS\" : \"FAIL\"}
            </td>
        </tr>
        <tr>
            <td>Error Rate</td>
            <td>\${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</td>
            <td class='\${data.metrics.http_req_failed.values.rate < 0.1 ? \"passed\" : \"failed\"}'>
                \${data.metrics.http_req_failed.values.rate < 0.1 ? \"PASS\" : \"FAIL\"}
            </td>
        </tr>
    </table>
    
    <p><em>Report generated at: \${new Date().toISOString()}</em></p>
</body>
</html>
                \`;
                
                fs.writeFileSync('$OUTPUT_DIR/report-$(date +%Y%m%d-%H%M%S).html', html);
                console.log('HTML report generated successfully');
            " 2>/dev/null || warning "Could not generate HTML report"
            
            log "Results saved to: $LATEST_RESULTS"
            log "HTML report saved to: $OUTPUT_DIR/report-$(date +%Y%m%d-%H%M%S).html"
        fi
    fi
    
    # Show quick summary
    echo
    echo "=== Quick Summary ==="
    echo "Test completed at: $(date)"
    echo "Results location: $OUTPUT_DIR"
    
    # Check thresholds
    if grep -q "✓" <<< "$K6_CMD"; then
        log "All thresholds passed! ✅"
    else
        warning "Some thresholds failed. Please review the results."
    fi
    
else
    error "Load test failed!"
    exit 1
fi

# Cleanup old results (keep last 10)
log "Cleaning up old results..."
ls -t "$OUTPUT_DIR"/results-*.json 2>/dev/null | tail -n +11 | xargs rm -f
ls -t "$OUTPUT_DIR"/report-*.html 2>/dev/null | tail -n +11 | xargs rm -f

log "Load test completed!"