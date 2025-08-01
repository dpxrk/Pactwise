# Input Validation Guide

This guide explains the comprehensive input validation system implemented for the Pactwise agent system.

## Overview

The validation system provides:
- **Type Safety**: Zod schemas ensure type correctness at runtime
- **Data Sanitization**: Automatic cleaning and normalization of inputs
- **Business Rule Validation**: Custom rules beyond type checking
- **Error Tracking**: Monitoring validation failures for improvement
- **Performance**: Efficient validation with caching

## Architecture

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Headers │ → Validate headers (auth, content-type)
    └────┬────┘
         │
    ┌────▼────┐
    │  Body   │ → Parse and validate request body
    └────┬────┘
         │
    ┌────▼────┐
    │ Sanitize│ → Clean and normalize data
    └────┬────┘
         │
    ┌────▼────┐
    │Business │ → Apply business rules
    │  Rules  │
    └────┬────┘
         │
    ┌────▼────┐
    │ Process │ → Execute with validated data
    └─────────┘
```

## Schema Structure

### Common Schemas (`schemas/common.ts`)

Basic reusable schemas for common data types:

```typescript
// UUID validation
const contractId = uuidSchema.parse('123e4567-e89b-12d3-a456-426614174000');

// Money validation
const amount = moneySchema.parse({ amount: 100.50, currency: 'USD' });

// Date range validation
const range = dateRangeSchema.parse({
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z'
});

// Email with normalization
const email = emailSchema.parse('TEST@EXAMPLE.COM'); // returns 'test@example.com'
```

### Agent Operation Schemas (`schemas/agent-operations.ts`)

Agent-specific operation validation:

```typescript
// Secretary agent operation
const operation = secretaryOperationSchema.parse({
  action: 'extract_metadata',
  contractId: '123e4567-e89b-12d3-a456-426614174000',
  content: 'Contract content here',
  format: 'text'
});

// Financial agent operation
const roiCalc = financialOperationSchema.parse({
  action: 'calculate_roi',
  investment: { amount: 10000, currency: 'USD' },
  returns: [
    { amount: 1000, currency: 'USD' },
    { amount: 1200, currency: 'USD' }
  ],
  period: 'monthly'
});
```

### Entity Schemas (`schemas/entities.ts`)

Core business entity validation:

```typescript
// Contract creation
const contract = contractCreateSchema.parse({
  name: 'Annual Service Agreement',
  vendorId: '123e4567-e89b-12d3-a456-426614174000',
  type: 'service',
  value: { amount: 50000, currency: 'USD' },
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z',
  autoRenew: true,
  renewalNoticeDays: 30
});

// Vendor with nested validation
const vendor = vendorCreateSchema.parse({
  name: 'Acme Corporation',
  primaryContact: {
    name: 'John Doe',
    email: 'john@acme.com',
    phone: '+1234567890'
  },
  address: {
    street1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US'
  }
});
```

## Using Validation in Agents

### 1. Basic Agent with Validation

```typescript
import { ValidatedBaseAgent } from './agents/base-validated';

class MyAgent extends ValidatedBaseAgent {
  getOperationSchema() {
    return myOperationSchema;
  }

  async processValidated(data: any, context?: AgentContext) {
    // Data is already validated and sanitized
    switch (data.action) {
      case 'my_action':
        return this.handleMyAction(data);
    }
  }
}
```

### 2. Custom Validation Rules

```typescript
class ContractAgent extends ValidatedBaseAgent {
  async processValidated(data: any, context?: AgentContext) {
    // Additional business rule validation
    const businessRules = await this.validateBusinessRules(
      data.action,
      data
    );

    if (!businessRules.valid) {
      return this.createResult(
        false,
        null,
        [this.createInsight(
          'business_rule_violation',
          'high',
          'Business Rule Validation Failed',
          businessRules.errors.join(', ')
        )],
        [],
        0
      );
    }

    // Process with valid data
    return this.executeOperation(data);
  }

  protected async validateBusinessRules(
    operation: string,
    data: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (operation === 'create_contract') {
      // Check vendor is active
      const vendor = await this.getVendor(data.vendorId);
      if (vendor.status !== 'active') {
        errors.push('Cannot create contract with inactive vendor');
      }

      // Check budget availability
      const budgetAvailable = await this.checkBudget(data.value);
      if (!budgetAvailable) {
        errors.push('Insufficient budget for contract value');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

### 3. Batch Validation

```typescript
async processBatchContracts(contracts: unknown[]) {
  const validation = await this.validateBatch(
    contracts,
    contractCreateSchema,
    {
      continueOnError: true,
      maxErrors: 10
    }
  );

  // Process valid contracts
  for (const contract of validation.valid) {
    await this.createContract(contract);
  }

  // Handle invalid contracts
  if (validation.invalid.length > 0) {
    await this.logValidationErrors(validation.invalid);
  }
}
```

## API Endpoint Validation

### 1. Using Validation Middleware

```typescript
import { validateRequestMiddleware } from './middleware/validation';
import { processRequestSchema } from './schemas/api';

serve(async (req) => {
  // Validate request
  const validation = await validateRequestMiddleware(
    req,
    processRequestSchema,
    { strict: true }
  );

  if (!validation.valid) {
    return validation.response!;
  }

  // Process with validated data
  const result = await processAgentRequest(validation.data);
  return new Response(JSON.stringify(result));
});
```

### 2. Creating Validated Handlers

```typescript
import { createValidatedHandler } from './middleware/validation';

const handleContractCreate = createValidatedHandler(
  contractCreateSchema,
  async (data, query, headers) => {
    // Data is validated
    const contract = await createContract(data);
    return new Response(JSON.stringify(contract));
  },
  {
    querySchema: paginationSchema,
    validateHeaders: true
  }
);
```

## Data Sanitization

### Built-in Sanitizers

```typescript
import { sanitizers } from './middleware/validation';

// Remove HTML tags
const safe = sanitizers.stripHtml('<script>alert("xss")</script>Hello');
// Result: 'Hello'

// Normalize whitespace
const normalized = sanitizers.normalizeWhitespace('  Hello   World  ');
// Result: 'Hello World'

// Truncate long strings
const truncated = sanitizers.truncate('Very long string...', 10);
// Result: 'Very lo...'
```

### Sanitization Transformers

```typescript
import { sanitizationTransformers as st } from './middleware/validation';

// Use in schemas
const userSchema = z.object({
  email: st.normalizedEmail,
  phone: st.normalizedPhone,
  bio: st.safeString,
  website: st.trimmedString.pipe(z.string().url())
});
```

## Error Handling

### 1. Validation Error Format

```typescript
{
  "error": "validation_error",
  "message": "Request validation failed",
  "errors": [
    {
      "path": "value.amount",
      "message": "Amount must be positive",
      "code": "too_small"
    },
    {
      "path": "endDate",
      "message": "End date must be after start date",
      "code": "custom"
    }
  ]
}
```

### 2. Custom Error Messages

```typescript
const contractSchema = z.object({
  name: z.string().min(3, {
    message: 'Contract name must be at least 3 characters long'
  }),
  value: moneySchema.refine(
    (money) => money.amount <= 1000000,
    {
      message: 'Contract value cannot exceed $1,000,000 without approval'
    }
  )
});
```

### 3. Error Tracking

Validation errors are automatically tracked for analysis:

```sql
-- View validation error trends
SELECT * FROM validation_error_summary
WHERE agent_type = 'secretary'
  AND error_hour >= NOW() - INTERVAL '24 hours';

-- Analyze patterns
SELECT * FROM analyze_validation_patterns(
  'enterprise-id',
  INTERVAL '7 days'
);
```

## Performance Optimization

### 1. Schema Caching

```typescript
// Schemas are parsed once and cached
const schemaCache = new Map<string, z.ZodSchema>();

function getCachedSchema(key: string, builder: () => z.ZodSchema) {
  if (!schemaCache.has(key)) {
    schemaCache.set(key, builder());
  }
  return schemaCache.get(key)!;
}
```

### 2. Lazy Validation

```typescript
// Only validate fields that are used
const lazySchema = z.object({
  basic: z.string(),
  details: z.lazy(() => expensiveSchema).optional()
});
```

### 3. Partial Validation

```typescript
// Validate only changed fields on update
const updateSchema = contractCreateSchema.partial();
const validUpdate = updateSchema.parse({
  name: 'Updated Name',
  value: { amount: 75000, currency: 'USD' }
});
```

## Best Practices

### 1. Schema Design

- **Keep schemas close to usage**: Define schemas near where they're used
- **Use composition**: Build complex schemas from simple ones
- **Be specific**: Use enums and literals for known values
- **Add descriptions**: Document complex validations

```typescript
const goodSchema = z.object({
  status: z.enum(['draft', 'active', 'expired'])
    .describe('Current contract status'),
  
  value: moneySchema
    .describe('Total contract value including taxes'),
  
  terms: z.object({
    payment: z.enum(['NET30', 'NET60', 'NET90']),
    penalty: percentageSchema.optional()
      .describe('Late payment penalty percentage')
  })
});
```

### 2. Error Messages

- **Be specific**: Tell users exactly what's wrong
- **Be helpful**: Suggest how to fix the error
- **Be consistent**: Use similar language across errors

```typescript
const ageSchema = z.number()
  .min(18, 'You must be at least 18 years old to use this service')
  .max(120, 'Please enter a valid age');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
```

### 3. Security

- **Never trust input**: Always validate, even from "trusted" sources
- **Sanitize early**: Clean data before processing
- **Log carefully**: Don't log sensitive validation failures
- **Limit sizes**: Prevent DoS with size limits

```typescript
const secureSchema = z.object({
  // Limit string lengths
  name: z.string().max(255),
  
  // Limit array sizes
  items: z.array(itemSchema).max(100),
  
  // Limit object size
  metadata: metadataSchema, // Has built-in 64KB limit
  
  // Sanitize file paths
  filePath: z.string().transform(sanitizers.sanitizePath)
});
```

## Testing Validation

### 1. Unit Tests

```typescript
describe('Contract Validation', () => {
  it('should validate valid contract', () => {
    const valid = {
      name: 'Test Contract',
      vendorId: '123e4567-e89b-12d3-a456-426614174000',
      // ... other fields
    };
    
    const result = contractCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid dates', () => {
    const invalid = {
      // ... fields
      startDate: '2024-12-31',
      endDate: '2024-01-01' // Before start
    };
    
    const result = contractCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toContain('before');
  });
});
```

### 2. Integration Tests

```typescript
it('should handle validation in API', async () => {
  const response = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'X', // Too short
      value: { amount: -100 } // Negative
    })
  });

  expect(response.status).toBe(400);
  const error = await response.json();
  expect(error.error).toBe('validation_error');
  expect(error.errors).toHaveLength(2);
});
```

## Monitoring and Debugging

### 1. Validation Metrics

```sql
-- Most common validation errors
SELECT 
  agent_type,
  operation,
  errors->0->>'path' as field,
  COUNT(*) as error_count
FROM agent_validation_errors
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY error_count DESC;
```

### 2. Debug Mode

```typescript
// Enable detailed validation logging
const debugValidation = (schema: z.ZodSchema, data: unknown) => {
  console.log('Validating:', data);
  const result = schema.safeParse(data);
  
  if (!result.success) {
    console.log('Validation failed:');
    result.error.errors.forEach(err => {
      console.log(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  
  return result;
};
```

### 3. Custom Validation Rules

```sql
-- Add custom validation rule
INSERT INTO validation_rules (
  rule_name,
  agent_type,
  operation,
  field_path,
  rule_type,
  rule_config,
  error_message,
  enterprise_id
) VALUES (
  'max_contract_value',
  'financial',
  'create_contract',
  'value.amount',
  'range',
  '{"max": 1000000}',
  'Contract value exceeds approval limit',
  'your-enterprise-id'
);
```

## Migration Guide

To add validation to existing code:

1. **Define schemas**:
   ```typescript
   const myOperationSchema = z.object({
     action: z.literal('my_action'),
     data: z.string()
   });
   ```

2. **Update agent**:
   ```typescript
   class MyAgent extends ValidatedBaseAgent {
     getOperationSchema() {
       return myOperationSchema;
     }
   }
   ```

3. **Update API endpoints**:
   ```typescript
   const validation = await validateRequestMiddleware(
     req,
     myRequestSchema
   );
   ```

4. **Add tests**:
   ```typescript
   test('validates my operation', () => {
     const result = myOperationSchema.safeParse(data);
     expect(result.success).toBe(true);
   });
   ```