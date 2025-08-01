import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginSuccess = new Rate('login_success');
const contractListDuration = new Trend('contract_list_duration');
const contractAnalysisDuration = new Trend('contract_analysis_duration');
const vendorSearchDuration = new Trend('vendor_search_duration');

// Test data
const users = new SharedArray('users', function () {
  return JSON.parse(open('./test-data/users.json'));
});

const contracts = new SharedArray('contracts', function () {
  return JSON.parse(open('./test-data/contracts.json'));
});

// Load test configuration
export let options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },
    
    // Load test - simulate normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },  // Ramp up to 100 users
        { duration: '10m', target: 100 }, // Stay at 100 users
        { duration: '5m', target: 200 },  // Ramp to 200 users
        { duration: '10m', target: 200 }, // Stay at 200 users
        { duration: '5m', target: 0 },    // Ramp down to 0
      ],
      startTime: '2m', // Start after smoke test
      tags: { scenario: 'load' },
    },
    
    // Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 },
      ],
      startTime: '40m', // Start after load test
      tags: { scenario: 'stress' },
    },
    
    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 }, // Spike to 1000 users
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      startTime: '75m', // Start after stress test
      tags: { scenario: 'spike' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],                   // Error rate under 10%
    login_success: ['rate>0.9'],                     // 90% successful logins
    contract_list_duration: ['p(95)<300'],           // Contract list loads in 300ms
    contract_analysis_duration: ['p(95)<5000'],      // Analysis completes in 5s
    vendor_search_duration: ['p(95)<200'],           // Search completes in 200ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://app.pactwise.com';
const API_TOKEN = __ENV.API_TOKEN;

// Helper function to make authenticated requests
function authenticatedRequest(url, params = {}) {
  const authParams = Object.assign({}, params);
  authParams.headers = Object.assign({}, params.headers, {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  });
  return authParams;
}

// Test scenarios
export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  
  group('Authentication', function () {
    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const loginSuccessful = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => r.json('token') !== undefined,
    });
    
    loginSuccess.add(loginSuccessful);
    
    if (!loginSuccessful) {
      return; // Skip rest of test if login failed
    }
    
    const token = loginRes.json('token');
    API_TOKEN = token; // Update token for subsequent requests
  });
  
  sleep(1);
  
  group('Contract Operations', function () {
    // List contracts
    const startList = new Date().getTime();
    const listRes = http.get(
      `${BASE_URL}/api/contracts`,
      authenticatedRequest()
    );
    const listDuration = new Date().getTime() - startList;
    contractListDuration.add(listDuration);
    
    check(listRes, {
      'contract list status is 200': (r) => r.status === 200,
      'contract list has data': (r) => r.json('contracts') !== undefined,
      'contract list response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(1);
    
    // Search contracts
    const searchRes = http.get(
      `${BASE_URL}/api/contracts?search=software`,
      authenticatedRequest()
    );
    
    check(searchRes, {
      'contract search status is 200': (r) => r.status === 200,
      'contract search returns results': (r) => r.json('contracts').length > 0,
    });
    
    sleep(1);
    
    // View contract details
    if (listRes.json('contracts') && listRes.json('contracts').length > 0) {
      const contractId = listRes.json('contracts')[0].id;
      const detailRes = http.get(
        `${BASE_URL}/api/contracts/${contractId}`,
        authenticatedRequest()
      );
      
      check(detailRes, {
        'contract detail status is 200': (r) => r.status === 200,
        'contract detail has data': (r) => r.json('contract') !== undefined,
      });
      
      // Trigger AI analysis (if not already analyzed)
      if (Math.random() < 0.1) { // 10% of requests trigger analysis
        const startAnalysis = new Date().getTime();
        const analysisRes = http.post(
          `${BASE_URL}/api/contracts/${contractId}/analyze`,
          null,
          authenticatedRequest()
        );
        const analysisDuration = new Date().getTime() - startAnalysis;
        contractAnalysisDuration.add(analysisDuration);
        
        check(analysisRes, {
          'contract analysis initiated': (r) => r.status === 202 || r.status === 200,
        });
      }
    }
  });
  
  sleep(2);
  
  group('Vendor Operations', function () {
    // List vendors
    const vendorListRes = http.get(
      `${BASE_URL}/api/vendors`,
      authenticatedRequest()
    );
    
    check(vendorListRes, {
      'vendor list status is 200': (r) => r.status === 200,
      'vendor list has data': (r) => r.json('vendors') !== undefined,
    });
    
    sleep(1);
    
    // Search vendors
    const startSearch = new Date().getTime();
    const vendorSearchRes = http.get(
      `${BASE_URL}/api/vendors?search=tech`,
      authenticatedRequest()
    );
    const searchDuration = new Date().getTime() - startSearch;
    vendorSearchDuration.add(searchDuration);
    
    check(vendorSearchRes, {
      'vendor search status is 200': (r) => r.status === 200,
      'vendor search < 200ms': (r) => r.timings.duration < 200,
    });
  });
  
  sleep(2);
  
  group('Dashboard Operations', function () {
    // Load dashboard
    const dashboardRes = http.get(
      `${BASE_URL}/api/dashboard/metrics`,
      authenticatedRequest()
    );
    
    check(dashboardRes, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard has metrics': (r) => r.json('metrics') !== undefined,
      'dashboard loads quickly': (r) => r.timings.duration < 1000,
    });
    
    // Load analytics
    const analyticsRes = http.get(
      `${BASE_URL}/api/analytics/overview`,
      authenticatedRequest()
    );
    
    check(analyticsRes, {
      'analytics status is 200': (r) => r.status === 200,
      'analytics has data': (r) => r.json('data') !== undefined,
    });
  });
  
  sleep(3);
  
  // Simulate real user behavior with random actions
  const actions = [
    () => {
      // View random contract
      const contractId = contracts[Math.floor(Math.random() * contracts.length)].id;
      http.get(`${BASE_URL}/api/contracts/${contractId}`, authenticatedRequest());
    },
    () => {
      // Search contracts
      const searchTerms = ['software', 'service', 'license', 'agreement'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      http.get(`${BASE_URL}/api/contracts?search=${term}`, authenticatedRequest());
    },
    () => {
      // Filter by status
      const statuses = ['active', 'draft', 'expired'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      http.get(`${BASE_URL}/api/contracts?status=${status}`, authenticatedRequest());
    },
    () => {
      // View vendor analytics
      http.get(`${BASE_URL}/api/vendors/analytics`, authenticatedRequest());
    },
    () => {
      // Check notifications
      http.get(`${BASE_URL}/api/notifications`, authenticatedRequest());
    },
  ];
  
  // Execute 2-5 random actions
  const numActions = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < numActions; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    action();
    sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
  }
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-results.html': htmlReport(data),
  };
}

// Helper function for text summary
function textSummary(data, options) {
  // Simple text summary implementation
  let summary = '\n=== Load Test Results ===\n\n';
  
  // Add threshold results
  summary += 'Thresholds:\n';
  for (const [metric, result] of Object.entries(data.metrics)) {
    if (result.thresholds) {
      summary += `  ${metric}: ${result.thresholds.passed ? 'PASSED' : 'FAILED'}\n`;
    }
  }
  
  return summary;
}

// Helper function for HTML report
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Pactwise Load Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Pactwise Load Test Results</h1>
    <h2>Summary</h2>
    <div class="metric ${data.metrics.http_req_failed.thresholds.passed ? 'passed' : 'failed'}">
        <strong>Overall Result:</strong> ${data.metrics.http_req_failed.thresholds.passed ? 'PASSED' : 'FAILED'}
    </div>
    
    <h2>Key Metrics</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Threshold</th>
            <th>Status</th>
        </tr>
        <tr>
            <td>Request Duration (95th percentile)</td>
            <td>${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</td>
            <td>&lt; 500ms</td>
            <td>${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'PASSED' : 'FAILED'}</td>
        </tr>
        <tr>
            <td>Error Rate</td>
            <td>${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</td>
            <td>&lt; 10%</td>
            <td>${data.metrics.http_req_failed.values.rate < 0.1 ? 'PASSED' : 'FAILED'}</td>
        </tr>
        <tr>
            <td>Login Success Rate</td>
            <td>${(data.metrics.login_success.values.rate * 100).toFixed(2)}%</td>
            <td>&gt; 90%</td>
            <td>${data.metrics.login_success.values.rate > 0.9 ? 'PASSED' : 'FAILED'}</td>
        </tr>
    </table>
    
    <h2>Scenario Results</h2>
    <ul>
        <li><strong>Smoke Test:</strong> Basic functionality verification</li>
        <li><strong>Load Test:</strong> Normal traffic simulation (100-200 users)</li>
        <li><strong>Stress Test:</strong> Breaking point identification (up to 400 users)</li>
        <li><strong>Spike Test:</strong> Sudden traffic surge handling (spike to 1000 users)</li>
    </ul>
    
    <p><em>Generated at: ${new Date().toISOString()}</em></p>
</body>
</html>
  `;
}