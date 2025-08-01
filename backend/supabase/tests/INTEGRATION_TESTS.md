# Multi-Agent Workflow Integration Tests

This document describes the comprehensive integration test suite for the multi-agent system in Pactwise.

## Overview

The integration tests verify that multiple agents can work together effectively to accomplish complex tasks while maintaining data consistency, handling errors gracefully, and meeting performance requirements.

## Test Structure

### 1. Multi-Agent Workflow Integration Tests (`multi-agent-workflows.test.ts`)

Tests the core workflow orchestration capabilities:

- **Manager Agent Orchestration**
  - Multi-agent contract analysis workflow
  - Partial failure handling with graceful degradation
  - Agent dependency management and execution ordering

- **Workflow Agent Multi-Step Execution**
  - Complete contract approval workflow with 6+ steps
  - Workflow rollback with compensation actions
  - Checkpoint-based recovery from failures

- **Data Consistency**
  - Cross-agent data sharing and updates
  - Concurrent execution without conflicts

- **Error Propagation**
  - Error handling through agent chains
  - Cascading failure management

- **Performance**
  - SLA compliance for multi-agent workflows
  - High-volume batch processing

### 2. Agent Coordination Tests (`agent-coordination.test.ts`)

Tests agent-to-agent communication and coordination:

- **Task Dependencies**
  - Parent-child task relationships
  - Circular dependency detection

- **Inter-Agent Communication**
  - Shared memory for context passing
  - Real-time event broadcasting

- **Priority and Resource Management**
  - Priority-based task scheduling
  - Rate limiting implementation

- **Failure Recovery**
  - Exponential backoff retry logic
  - Circuit breaker pattern

- **Metrics and Monitoring**
  - Performance tracking
  - Degradation detection

### 3. Real-World Scenarios (`agent-scenarios.test.ts`)

Tests complete business workflows:

- **Contract Lifecycle Management**
  - 6-agent contract review process
  - Contract renewal assessment
  - Decision automation

- **Vendor Risk Management**
  - Compliance violation detection
  - Risk escalation workflow
  - Action plan generation

- **Multi-Enterprise Scenarios**
  - Data isolation between tenants
  - Cross-enterprise security

## Running the Tests

### Prerequisites

1. Local Supabase instance running:
   ```bash
   npm run start
   ```

2. Test database configured with migrations:
   ```bash
   npm run reset
   ```

### Run All Integration Tests
```bash
./tests/run-integration-tests.sh
```

### Run with Coverage
```bash
./tests/run-integration-tests.sh --coverage
```

### Run Individual Test Suites
```bash
# Multi-agent workflows
npm test multi-agent-workflows.test.ts

# Agent coordination
npm test agent-coordination.test.ts

# Real-world scenarios
npm test agent-scenarios.test.ts

# Performance tests
npm test agent-tasks-performance.test.ts
```

### Run Specific Test
```bash
npm test multi-agent-workflows.test.ts -- -t "should successfully orchestrate multiple agents"
```

## Test Data Setup

Each test suite uses isolated test data:

1. **Test Enterprise**: Created fresh for each test
2. **Test Users**: Admin/Manager roles for permissions
3. **Test Agents**: Initialized with required capabilities
4. **Test Contracts/Vendors**: Sample data for workflows

## Key Test Patterns

### 1. Agent Initialization
```typescript
const { data: agent } = await supabase
  .from('agents')
  .insert({
    name: 'Test Agent',
    type: 'secretary',
    enterprise_id: enterpriseId,
  })
  .select()
  .single();
```

### 2. Task Creation and Execution
```typescript
const { data: task } = await supabase
  .from('agent_tasks')
  .insert({
    agent_id: agent.id,
    task_type: 'analyze',
    priority: 8,
    status: 'pending',
    payload: { data: 'test' },
    enterprise_id: enterpriseId,
  })
  .select()
  .single();

// Execute via agent
const result = await agent.processTask(task.id);
```

### 3. Workflow Definition
```typescript
const workflow = {
  workflowId: 'contract-approval',
  steps: [
    {
      id: 'extract',
      agent: 'secretary',
      action: 'extract_metadata',
    },
    {
      id: 'review',
      agent: 'legal',
      action: 'review_terms',
      dependsOn: ['extract'],
    },
  ],
};
```

### 4. Assertion Patterns
```typescript
// Verify task completion
expect(result.success).toBe(true);
expect(result.insights).toHaveLength(greaterThan(0));

// Verify data consistency
const { data: insights } = await supabase
  .from('agent_insights')
  .select('*')
  .eq('contract_id', contractId);
expect(insights).toContainEqual(
  expect.objectContaining({
    type: 'risk_identified',
    severity: 'high',
  })
);
```

## Performance Benchmarks

Expected performance metrics:

- **Single Agent Task**: < 500ms
- **5-Agent Workflow**: < 5 seconds
- **10-Contract Batch**: < 10 seconds
- **Query with Indexes**: < 100ms

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure Supabase is running: `npm run start`
   - Check DATABASE_URL in test environment

2. **Permission Errors**
   - Verify service role key is set
   - Check RLS policies are applied

3. **Timeout Errors**
   - Increase test timeout: `--testTimeout=30000`
   - Check for blocking operations

4. **Data Isolation Issues**
   - Ensure proper cleanup in afterEach
   - Use unique identifiers for test data

### Debug Mode

Enable detailed logging:
```bash
DEBUG=true npm test multi-agent-workflows.test.ts
```

View SQL queries:
```bash
SUPABASE_LOG_LEVEL=debug npm test
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Integration Tests
  run: |
    npm run start &
    sleep 10
    npm run reset
    ./tests/run-integration-tests.sh
  env:
    CI: true
```

### Coverage Requirements
- Overall: > 80%
- Critical paths: > 90%
- Error handling: > 85%

## Best Practices

1. **Test Isolation**
   - Each test creates its own data
   - Cleanup after each test
   - No shared state between tests

2. **Realistic Scenarios**
   - Use production-like data volumes
   - Test error conditions
   - Verify edge cases

3. **Performance Testing**
   - Measure critical paths
   - Set performance budgets
   - Monitor for regressions

4. **Assertion Quality**
   - Test behavior, not implementation
   - Verify side effects
   - Check error messages

## Future Enhancements

1. **Load Testing**
   - Concurrent user scenarios
   - Stress test agent queues
   - Memory leak detection

2. **Chaos Testing**
   - Random failure injection
   - Network partition simulation
   - Resource exhaustion

3. **Contract Testing**
   - Agent interface validation
   - API compatibility checks
   - Schema evolution tests