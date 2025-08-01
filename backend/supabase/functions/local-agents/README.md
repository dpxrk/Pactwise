# Local AI Agents System

This directory contains a comprehensive local AI agent system that operates without any LLM API dependencies. All agents use rule-based logic, pattern matching, and database-driven intelligence.

## Overview

The system consists of 7 specialized agents, each handling specific aspects of contract and vendor management:

1. **Manager Agent** - Orchestrates other agents and handles task routing
2. **Secretary Agent** - Document processing and data extraction
3. **Financial Agent** - Financial analysis and risk assessment
4. **Legal Agent** - Legal review and compliance checking
5. **Analytics Agent** - Data analysis and insight generation
6. **Vendor Agent** - Vendor evaluation and relationship management
7. **Notifications Agent** - Alert management and notification routing

## Architecture

### Base Agent Class
All agents extend the `BaseAgent` class which provides:
- Standard result formatting
- Insight generation
- Confidence scoring
- Error handling

### Agent Capabilities

#### Secretary Agent
- Document text extraction
- Contract metadata parsing
- Vendor information processing
- Entity recognition (dates, amounts, parties)
- Document classification

#### Financial Agent
- Contract value analysis
- Payment term extraction
- ROI calculation
- Budget impact assessment
- Cost breakdown analysis
- Financial risk scoring

#### Legal Agent
- Clause identification and extraction
- Risk assessment
- Compliance checking (GDPR, HIPAA, etc.)
- Missing clause detection
- Legal term analysis

#### Analytics Agent
- Trend analysis
- Anomaly detection
- Performance metrics
- Predictive analytics
- Report generation

#### Vendor Agent
- Vendor performance scoring
- Relationship assessment
- Risk evaluation
- Onboarding evaluation
- Portfolio analysis

#### Notifications Agent
- Alert severity assessment
- Recipient determination
- Channel selection
- Reminder scheduling
- Digest generation
- Alert fatigue prevention

#### Manager Agent
- Request analysis and classification
- Agent selection and routing
- Dependency management
- Workflow orchestration
- Priority assessment

## Usage

### Basic Agent Usage

```typescript
import { SecretaryAgent } from './agents/secretary.ts';

const agent = new SecretaryAgent(supabaseClient, enterpriseId);
const result = await agent.process(data, context);
```

### Manager Agent Orchestration

```typescript
import { ManagerAgent } from './agents/manager.ts';

const manager = new ManagerAgent(supabaseClient, enterpriseId);
const orchestrationResult = await manager.process(request);
```

### Processing Results

All agents return a standardized `ProcessingResult`:

```typescript
interface ProcessingResult {
  success: boolean;
  data: any;
  insights: Insight[];
  rulesApplied: string[];
  confidence: number;
  processingTime: number;
  metadata?: Record<string, any>;
}
```

## Key Features

### Rule-Based Processing
- No LLM API calls required
- Deterministic results
- Fast processing times
- Predictable behavior

### Pattern Matching
- Regular expressions for text extraction
- Template-based classification
- Keyword-based routing
- Context-aware processing

### Database Integration
- Leverages PostgreSQL capabilities
- Full-text search
- Vector embeddings (when needed)
- Historical data analysis

### Comprehensive Analysis
- Multi-dimensional risk assessment
- Financial impact calculation
- Compliance verification
- Performance tracking

## API Endpoints

### Process with Specific Agent
```
POST /local-agents/{agentType}/process
```

### Orchestrate Complex Request
```
POST /local-agents/orchestrate
```

### Process Queued Tasks
```
POST /local-agents/process-queue
```

## Configuration

Agents can be configured through:
- Enterprise-specific settings
- Agent-level configuration
- Task-specific parameters

## Performance

- Average processing time: < 100ms per agent
- No external API latency
- Scalable to thousands of requests
- Memory efficient

## Testing

Comprehensive test suite available in `/tests/local-agents.test.ts`

Run tests:
```bash
npm test local-agents
```

## Benefits

1. **No LLM Costs** - Completely free to run
2. **Privacy** - All data stays local
3. **Speed** - No API latency
4. **Reliability** - No external dependencies
5. **Predictability** - Deterministic outputs
6. **Customizable** - Easy to modify rules

## Limitations

- Less flexible than LLM-based agents
- Requires explicit rules for new scenarios
- Limited natural language understanding
- May miss nuanced interpretations

## Future Enhancements

- Machine learning models for classification
- Advanced NLP techniques
- More sophisticated pattern matching
- Enhanced analytics capabilities
- Improved context understanding

## Memory System

### Overview
The agent system includes a sophisticated memory system that enables agents to learn from past interactions and improve over time.

### Memory Architecture

#### Short-term Memory
- User-specific temporary storage
- 24-hour expiration by default
- Quick access for recent context
- Automatic importance scoring

#### Long-term Memory
- Persistent storage for important information
- Consolidation from short-term memory
- Category-based organization
- Vector embeddings for semantic search

### Memory Features

1. **Automatic Storage**: Agents automatically store important information during processing
2. **Context Loading**: Agents load relevant memories before processing tasks
3. **Memory Consolidation**: Important short-term memories are promoted to long-term storage
4. **Memory Decay**: Unused memories gradually lose importance
5. **Semantic Search**: Find relevant memories using vector similarity

### Memory Types
- `contract_analysis`: Contract details and analysis results
- `vendor_profile`: Vendor information and assessments
- `contract_risk`: High-risk clauses and issues
- `vendor_compliance_issue`: Compliance problems
- `workflow_state`: Process states and decisions
- `user_preference`: User-specific preferences
- `insight_generated`: Important insights from analysis

## Task Processing Engine

### Overview
A robust task processing engine manages agent execution with enterprise isolation and scalability.

### Features
- Asynchronous task queue
- Priority-based processing
- Automatic retries with exponential backoff
- Enterprise-specific agent isolation
- Real-time status updates
- Performance metrics tracking

### Starting the Processor
```bash
# Start the agent processor
curl -X POST https://your-supabase-url/functions/v1/agent-processor/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check status
curl https://your-supabase-url/functions/v1/agent-processor/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Submitting Tasks
```javascript
const response = await fetch('/functions/v1/agent-processor/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agentType: 'secretary',
    taskType: 'document_analysis',
    payload: { documentId: 'doc123' },
    priority: 7
  })
});
```

## Donna AI - Global Learning System

### Overview
Donna is a global AI that learns from anonymized patterns across all enterprises, providing cross-organizational insights while maintaining data privacy.

### Key Features
1. **Cross-Enterprise Learning**: Learns from patterns across all organizations
2. **Data Anonymization**: All data is anonymized before Donna processes it
3. **Pattern Recognition**: Identifies common patterns and best practices
4. **Q-Learning**: Continuously improves recommendations based on outcomes
5. **Industry Insights**: Provides industry-specific recommendations

### How Donna Works
1. **Data Collection**: Anonymized data from all enterprises
2. **Pattern Extraction**: Identifies common patterns and trends
3. **Best Practice Generation**: Creates recommendations from successful patterns
4. **Continuous Learning**: Updates knowledge based on feedback

### Querying Donna
```javascript
// Get insights from Donna
const insights = await fetch('/functions/v1/donna/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'contract_optimization',
    context: {
      contractType: 'service_agreement',
      value_range: 'large',
      industry: 'technology'
    }
  })
});

// Submit feedback for learning
await fetch('/functions/v1/donna/feedback', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    queryId: insights.id,
    success: true,
    metrics: { time_saved: 120, accuracy: 0.95 },
    userSatisfaction: 0.9
  })
});
```

### Privacy and Security
- All data is anonymized using database functions
- No personally identifiable information (PII) is stored
- Enterprise-specific data remains isolated
- Industry and company size categorization only
- Secure pattern storage with confidence scoring

## Enterprise Configuration

### Agent Configuration
```javascript
await fetch('/functions/v1/enterprise/agents/config', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabledAgents: ['secretary', 'manager', 'financial', 'legal'],
    memoryConfig: {
      maxShortTermMemories: 1000,
      maxLongTermMemories: 10000,
      consolidationThreshold: 5
    }
  })
});
```

## Best Practices

1. **Task Priority**: Use priorities 1-10 appropriately (10 = highest)
2. **Memory Importance**: Critical information gets scores 0.7-1.0
3. **Feedback Loop**: Always provide feedback to Donna for better learning
4. **Rich Context**: Provide detailed context for better agent decisions
5. **Regular Monitoring**: Check agent performance metrics regularly

## Monitoring and Analytics

### Agent Performance
```bash
curl https://your-supabase-url/functions/v1/agent-processor/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Donna Knowledge Stats
```bash
curl https://your-supabase-url/functions/v1/donna/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Memory Statistics
```bash
curl https://your-supabase-url/functions/v1/memory/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```