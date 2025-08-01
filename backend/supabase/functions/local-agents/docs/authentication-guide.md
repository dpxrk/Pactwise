# Agent Authentication Guide

This guide explains how to implement and use the agent-to-agent authentication system in Pactwise.

## Overview

The authentication system provides:
- **API Key Management**: Long-lived credentials for agent identification
- **JWT Tokens**: Short-lived tokens for secure agent-to-agent communication
- **Permission System**: Fine-grained access control
- **Trust Relationships**: Explicit trust between agents
- **Audit Logging**: Complete authentication trail

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Agent A       │────▶│   Agent B       │
│                 │     │                 │
│ - API Key       │     │ - API Key       │
│ - JWT Secret    │     │ - JWT Secret    │
│ - Permissions   │     │ - Permissions   │
└─────────────────┘     └─────────────────┘
        │                       │
        └───────┬───────────────┘
                │
        ┌───────▼────────┐
        │ Auth Service   │
        │                │
        │ - Validate     │
        │ - Generate     │
        │ - Trust Check  │
        └────────────────┘
```

## Quick Start

### 1. Initialize Agent with Authentication

```typescript
import { AuthenticatedBaseAgent } from './agents/base-authenticated';

class MyAgent extends AuthenticatedBaseAgent {
  async initialize(createdBy: string) {
    await super.initialize(createdBy);
    
    // Agent now has:
    // - API key generated
    // - JWT secret created
    // - Default permissions granted
    // - Secure channel ready
  }
}
```

### 2. Authenticate Requests

```typescript
// Using API Key
const agent = new MyAgent(supabase, enterpriseId);
const authenticated = await agent.authenticate(apiKey);

// Using JWT in request handler
const authContext = await authenticateAgent(req, supabase);
if (!authContext.authenticated) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 3. Secure Agent Communication

```typescript
// Call another agent securely
const result = await this.callAgent(
  'financial',           // Target agent type
  'analyze_costs',       // Operation
  { contractId: '123' }, // Data
  context               // Optional context
);
```

## API Key Management

### Generate API Key

```typescript
const authService = new AgentAuthService(supabase);
const { apiKey, keyId, expiresAt } = await authService.generateApiKey(
  agentId,
  createdByUserId,
  365 // Days until expiration
);

// Store securely - this is the only time you'll see the key
console.log(`Agent API Key: ${apiKey}`);
```

### Validate API Key

```typescript
const authContext = await authService.validateApiKey(apiKey);
if (authContext.authenticated) {
  console.log(`Authenticated agent: ${authContext.agentId}`);
  console.log(`Permissions: ${authContext.permissions}`);
}
```

### Rotate API Keys

```typescript
// Generate new key (automatically deactivates old ones)
const newCredentials = await authService.generateApiKey(
  agentId,
  userId,
  365
);

// Revoke specific credentials
await authService.revokeCredentials(
  agentId,
  'api_key',
  revokedByUserId,
  'Security rotation'
);
```

## JWT Token Usage

### Generate JWT for Agent Communication

```typescript
const token = await authService.generateJWT(
  agentId,
  enterpriseId,
  ['read_contracts', 'share_insights'], // Scope
  3600 // Expiration in seconds
);
```

### Verify JWT Token

```typescript
const authContext = await authService.verifyJWT(token);
if (authContext.authenticated) {
  // Token is valid
  const { agentId, permissions } = authContext;
}
```

## Permission System

### Grant Permissions

```typescript
await authService.grantPermission(
  agentId,
  'read_financial_data',
  grantedByUserId,
  {
    resourceType: 'financial_reports',
    resourceId: null, // null = all resources of this type
    allowedActions: ['read', 'list'],
    validForDays: 30,
    conditions: {
      maxRecords: 100,
      datRange: 'last_30_days'
    }
  }
);
```

### Check Permissions

```typescript
const hasPermission = await authService.checkPermission(
  agentId,
  'read_financial_data',
  'financial_reports',  // Resource type
  reportId,             // Specific resource
  'read'               // Action
);
```

### Using Permission Decorators

```typescript
class FinancialAgent extends AuthenticatedBaseAgent {
  @requirePermission('analyze_finances')
  async analyzeContract(contractId: string) {
    // Method only executes if agent has permission
  }
}
```

## Trust Relationships

### Establish Trust

```typescript
// One-way trust
await authService.establishTrust(
  trustorId,    // Agent granting trust
  trusteeId,    // Agent receiving trust
  'limited',    // Trust level: 'full' | 'limited' | 'read_only'
  ['share_insights', 'request_data'], // Allowed operations
  establishedByUserId,
  30 // Valid for days
);

// Bidirectional trust
await secureChannel.establishBidirectionalTrust(
  otherAgentId,
  'limited',
  ['share_insights'],
  establishedByUserId,
  30
);
```

### Check Trust

```typescript
const hasTrust = await authService.checkAgentTrust(
  trustorId,
  trusteeId,
  'share_insights' // Optional: specific operation
);
```

## Secure Communication

### Send Secure Message

```typescript
const channel = new SecureAgentChannel(supabase, agentId, enterpriseId);

const response = await channel.sendMessage(
  targetAgentId,
  AgentProtocol.Operations.SHARE_INSIGHTS,
  {
    insights: [...],
    metadata: {...}
  },
  {
    encryptPayload: true,    // Encrypt sensitive data
    requireSignature: true,  // Digital signature
    timeoutMs: 30000,       // 30 second timeout
    retryAttempts: 3        // Retry on failure
  }
);
```

### Receive Secure Message

```typescript
const { authenticated, payload, context } = await channel.receiveMessage(
  message,
  token,
  expectedOperation // Optional validation
);

if (authenticated) {
  // Process the secure payload
  console.log(`Message from: ${context.agentId}`);
  console.log(`Payload: ${payload}`);
}
```

### Protocol Messages

```typescript
// Standard protocol message format
const message = AgentProtocol.createMessage(
  AgentProtocol.Operations.REQUEST_DATA,
  {
    contractId: '123',
    fields: ['financial_summary', 'risk_score']
  },
  {
    urgency: 'high',
    correlationId: 'req-456'
  }
);
```

## Security Best Practices

### 1. API Key Security
- Store API keys securely (environment variables, secret management)
- Never commit API keys to version control
- Rotate keys regularly (every 90-365 days)
- Use different keys for different environments

### 2. JWT Security
- Keep JWT expiration short (5-60 minutes)
- Never store JWT secrets in code
- Validate tokens on every request
- Check token hasn't been revoked

### 3. Permission Management
- Follow principle of least privilege
- Grant minimal required permissions
- Set expiration dates on permissions
- Regularly audit permissions

### 4. Trust Relationships
- Establish trust only when needed
- Use limited trust levels when possible
- Set expiration on trust relationships
- Monitor trust usage

### 5. Audit Logging
- Log all authentication events
- Monitor for suspicious patterns
- Set up alerts for failures
- Retain logs per compliance requirements

## Common Patterns

### Pattern 1: Secure Data Request

```typescript
async requestDataFromAgent(targetType: string, dataType: string) {
  // 1. Check if we have permission to make request
  const canRequest = await this.authService.checkPermission(
    this.agentId,
    `request_${dataType}`,
    'agents',
    null,
    'request'
  );
  
  if (!canRequest) {
    throw new Error('Permission denied');
  }

  // 2. Ensure trust relationship exists
  const targetId = await this.getAgentIdByType(targetType);
  const hasTrust = await this.authService.checkAgentTrust(
    targetId,
    this.agentId,
    AgentProtocol.Operations.REQUEST_DATA
  );

  if (!hasTrust) {
    // Request trust establishment
    await this.requestTrustEstablishment(targetId);
    throw new Error('Trust relationship pending');
  }

  // 3. Send secure request
  return await this.callAgent(
    targetType,
    AgentProtocol.Operations.REQUEST_DATA,
    { dataType, requester: this.agentId }
  );
}
```

### Pattern 2: Delegated Authentication

```typescript
async performActionOnBehalf(principalAgentId: string, action: string) {
  // 1. Verify delegation permission
  const canDelegate = await this.authService.checkPermission(
    principalAgentId,
    'delegate_to_agent',
    'agents',
    this.agentId,
    'delegate'
  );

  if (!canDelegate) {
    throw new Error('Delegation not authorized');
  }

  // 2. Create delegated context
  const delegatedToken = await this.authService.generateJWT(
    this.agentId,
    this.enterpriseId,
    [`delegated:${action}`],
    300 // 5 minute delegation
  );

  // 3. Perform action with delegation context
  return await this.performAction(action, {
    delegatedBy: principalAgentId,
    delegationToken: delegatedToken
  });
}
```

### Pattern 3: Workflow Authentication

```typescript
async executeAuthenticatedWorkflow(workflow: any) {
  const workflowToken = await this.authService.generateJWT(
    this.agentId,
    this.enterpriseId,
    ['execute_workflow'],
    workflow.estimatedDuration || 3600
  );

  for (const step of workflow.steps) {
    // Each step uses the workflow token
    const stepResult = await this.callAgent(
      step.agentType,
      AgentProtocol.Operations.WORKFLOW_HANDOFF,
      {
        step: step,
        workflowId: workflow.id,
        workflowToken
      }
    );

    if (!stepResult.success) {
      await this.handleWorkflowFailure(workflow, step, workflowToken);
      break;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - Ensure agent is initialized with credentials
   - Check API key or JWT token is valid
   - Verify token hasn't expired

2. **"Permission denied" error**
   - Check agent has required permission
   - Verify permission hasn't expired
   - Check resource-specific permissions

3. **"No trust relationship" error**
   - Establish trust before communication
   - Check trust hasn't expired
   - Verify trust allows the operation

4. **"Token validation failed"**
   - Check JWT secret is correct
   - Verify token hasn't been tampered
   - Ensure token hasn't been revoked

### Debug Authentication

```typescript
// Enable auth logging
const authService = new AgentAuthService(supabase);
authService.enableDebugLogging = true;

// Check auth logs
const { data: logs } = await supabase
  .from('agent_auth_logs')
  .select('*')
  .eq('agent_id', agentId)
  .order('created_at', { ascending: false })
  .limit(50);

// Analyze failures
const failures = logs.filter(l => !l.success);
console.log('Recent failures:', failures);
```

## Migration Guide

To add authentication to existing agents:

1. **Extend AuthenticatedBaseAgent**
   ```typescript
   - class MyAgent extends BaseAgent
   + class MyAgent extends AuthenticatedBaseAgent
   ```

2. **Add initialization**
   ```typescript
   const agent = new MyAgent(supabase, enterpriseId);
   await agent.initialize(userId);
   ```

3. **Update agent calls**
   ```typescript
   - await this.callAnotherAgent(data)
   + await this.callAgent('target-type', 'operation', data)
   ```

4. **Add permission checks**
   ```typescript
   @requirePermission('my-permission')
   async sensitiveMethod() { ... }
   ```

5. **Establish trust relationships**
   ```typescript
   await this.establishAgentTrust(targetId, 'operation');
   ```

## Performance Considerations

- **Cache permissions**: Permissions are cached for 5 minutes by default
- **Reuse JWT tokens**: Don't generate new tokens for each call
- **Batch trust checks**: Check multiple trust relationships together
- **Monitor token expiration**: Refresh tokens before expiration
- **Use connection pooling**: Reuse secure channels

## Compliance and Auditing

The authentication system maintains complete audit trails:

```sql
-- View authentication events
SELECT 
  event_type,
  success,
  failure_reason,
  created_at
FROM agent_auth_logs
WHERE agent_id = 'agent-id'
ORDER BY created_at DESC;

-- Monitor permission usage
SELECT 
  permission_type,
  resource_type,
  last_checked_at,
  check_count
FROM agent_permissions
WHERE agent_id = 'agent-id';

-- Analyze trust relationships
SELECT 
  trustee_agent_id,
  trust_level,
  interaction_count,
  last_interaction_at
FROM agent_trust_relationships
WHERE trustor_agent_id = 'agent-id';
```