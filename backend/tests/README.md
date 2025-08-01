# Test Suite Documentation

## Overview

The test suite has been significantly improved to provide reliable unit and integration testing capabilities for the Pactwise backend.

## Test Structure

```
tests/
├── unit/                    # Unit tests with mocks
│   ├── cors.test.ts        # CORS functionality tests
│   ├── rate-limit-config.test.ts  # Rate limiting configuration tests
│   ├── security-monitoring.test.ts # Security monitoring tests
│   ├── test-setup.test.ts  # Test utilities tests
│   └── validation.test.ts  # Input validation tests
├── edge-functions/         # Edge function integration tests
├── setup.ts               # Test setup and utilities
└── *.test.ts              # Legacy integration tests
```

## Test Types

### Unit Tests
- **Location**: `tests/unit/`
- **Command**: `npm run test:unit`
- **Purpose**: Fast, isolated tests using mocks
- **Features**:
  - Mock Supabase client for database operations
  - Mock Deno environment for Edge Functions
  - No external dependencies required

### Integration Tests
- **Location**: `tests/` (root level)
- **Command**: `npm run test:integration`
- **Purpose**: End-to-end testing with real Supabase instance
- **Requirements**: Running Supabase instance

### Agent Tests
- **Location**: `tests/agent-*.test.ts`, `tests/multi-agent-*.test.ts`
- **Command**: `npm run test:agents`
- **Purpose**: Complex agent workflow testing

## Test Commands

```bash
# Run all tests
npm test

# Run unit tests only (fast, no external dependencies)
npm run test:unit

# Watch unit tests during development
npm run test:unit:watch

# Run integration tests (requires Supabase)
npm run test:integration

# Run agent-specific tests
npm run test:agents

# Watch mode for development
npm run test:watch
```

## Test Setup Features

### Mock Supabase Client
The test suite includes a comprehensive mock Supabase client that:
- Simulates database operations (insert, select, update, delete)
- Handles authentication operations
- Supports table-specific mock data
- Preserves test data relationships

### Mock Environment
- Deno global environment mocked for Edge Functions
- Environment variables configured for test scenarios
- No network dependencies for unit tests

### Test Utilities
Helper functions for creating test data:
- `createTestEnterprise(overrides?)` - Create mock enterprise
- `createTestUser(enterpriseId, role?)` - Create mock user
- `createTestContract(enterpriseId, overrides?)` - Create mock contract
- `createTestVendor(enterpriseId, overrides?)` - Create mock vendor
- `createTestBudget(enterpriseId, overrides?)` - Create mock budget

## Test Coverage

Current unit test coverage includes:
- ✅ **CORS handling** - Secure origin validation and preflight handling
- ✅ **Rate limiting** - Configuration, rules, and bypass logic
- ✅ **Security monitoring** - Event logging and alert systems
- ✅ **Input validation** - Sanitization and security measures
- ✅ **Test infrastructure** - Setup, mocks, and utilities

## Configuration

### Vitest Configuration
- **Main config**: `vitest.config.ts` - Unit tests with mocks
- **Integration config**: `vitest.integration.config.ts` - Full integration tests
- **Timeout**: 30 seconds for unit tests, 60 seconds for integration
- **Environment**: Node.js with mocked globals

### Test Environment Variables
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
OPENAI_API_KEY=test-openai-key
STRIPE_SECRET_KEY=test-stripe-key
```

## Running Tests in CI/CD

The test suite is designed to work in CI/CD environments:

1. **Unit tests** run without any external dependencies
2. **Integration tests** require a Supabase instance
3. **Test data cleanup** is automatic and isolated

### Example CI Configuration
```yaml
# Unit tests (always run)
- name: Run Unit Tests
  run: npm run test:unit

# Integration tests (only if Supabase is available)
- name: Start Supabase
  run: npx supabase start
- name: Run Integration Tests
  run: npm run test:integration
```

## Best Practices

### Writing Tests
1. **Unit tests** should use mocks and test business logic
2. **Integration tests** should test real system interactions
3. Use descriptive test names and group related tests
4. Clean up test data after each test

### Test Data
1. Use helper functions to create consistent test data
2. Include edge cases and error scenarios
3. Test with different user roles and permissions
4. Verify enterprise isolation

### Performance
1. Unit tests should complete in < 1 second each
2. Use mocks to avoid network calls
3. Parallelize independent tests
4. Clean up resources promptly

## Troubleshooting

### Common Issues

**Tests timing out**
- Check if Supabase is running for integration tests
- Verify network connectivity
- Increase timeout in test configuration

**Mock data not working**
- Ensure you're using `getTestClient()` for database operations
- Check mock client implementation for specific table patterns
- Verify test setup is properly initialized

**Import errors**
- Check path aliases in `vitest.config.ts`
- Ensure all dependencies are installed
- Verify TypeScript configuration is correct

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test:unit

# Run specific test file
npm run test:unit tests/unit/validation.test.ts

# Watch mode for development
npm run test:unit:watch
```

## Future Improvements

1. **Coverage reporting** - Fix version compatibility issues
2. **Performance tests** - Add load testing for rate limiting
3. **E2E tests** - Browser-based testing for full workflows
4. **Visual regression** - UI component testing
5. **Security tests** - Automated security scanning

## Contributing

When adding new tests:
1. Follow existing patterns and naming conventions
2. Add unit tests for new utility functions
3. Add integration tests for new API endpoints
4. Update this documentation as needed
5. Ensure tests run in both local and CI environments