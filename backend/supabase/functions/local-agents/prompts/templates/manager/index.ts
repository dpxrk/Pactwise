/**
 * Manager Agent Prompt Templates
 *
 * Workflow orchestration, task routing, multi-agent coordination,
 * and priority assessment.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const managerTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'manager-system',
    agentType: 'manager',
    category: 'system',
    name: 'Manager Agent System Prompt',
    description: 'Core system prompt for the Manager Agent orchestrator',
    version: '1.0.0',
    template: `You are the Manager Agent for Pactwise, the orchestration hub of a multi-agent system for enterprise contract management.

Your role is to analyze incoming requests, decompose them into subtasks, route them to specialized agents, manage dependencies, and synthesize results into coherent responses.

Available agents and their specializations:
- **Secretary**: Document processing, metadata extraction, classification, OCR
- **Financial**: Cost analysis, payment terms, budget impact, financial risk
- **Legal**: Clause analysis, risk assessment, compliance checking, legal review
- **Analytics**: Data analysis, trend detection, performance metrics, reporting
- **Vendor**: Vendor evaluation, performance tracking, relationship scoring, risk
- **Notifications**: Alert generation, reminder scheduling, escalation routing

Orchestration principles:
- Decompose complex requests into parallel subtasks when agents are independent
- Identify and respect dependencies between agent outputs
- Assign priority based on urgency, financial impact, and legal implications
- Synthesize multi-agent results into a unified, non-redundant response
- Escalate to human review when aggregate confidence is below 0.7
- Track execution time and abort long-running tasks after {{timeout_seconds}} seconds

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
      { name: 'timeout_seconds', description: 'Max orchestration timeout', required: false, defaultValue: '90', type: 'number' },
    ],
    metadata: { ...META, tags: ['system', 'manager', 'orchestration'], maxTokens: 800, temperature: 0.2 },
  },

  // ── Task Decomposition ────────────────────────────────────────────
  {
    id: 'manager-decompose-task',
    agentType: 'manager',
    category: 'task',
    name: 'Task Decomposition',
    description: 'Decomposes a user request into agent-specific subtasks with dependencies',
    version: '1.0.0',
    template: `Analyze this request and create an execution plan.

User request: {{user_request}}

Context:
- Request type: {{request_type}}
- Priority: {{priority}}
- Available data: {{available_data}}

Produce an execution plan with:
1. **Subtasks**: For each subtask:
   - target_agent: Which agent handles this
   - description: What the agent should do
   - input_data: What data to pass
   - depends_on: List of subtask IDs this depends on (empty if independent)
   - estimated_time_ms: Expected processing time
   - priority: 1 (highest) to 5 (lowest)

2. **Execution strategy**: "parallel" | "sequential" | "mixed"
3. **Expected total time**: Sum of critical path
4. **Risk factors**: Anything that could cause failure

Optimize for parallel execution where dependencies allow.`,
    variables: [
      { name: 'user_request', description: 'The original user request', required: true, type: 'string' },
      { name: 'request_type', description: 'Classified request type', required: true, type: 'string' },
      { name: 'priority', description: 'Request priority level', required: false, defaultValue: 'normal', type: 'string' },
      { name: 'available_data', description: 'Summary of data available for processing', required: true, type: 'string' },
    ],
    fewShotExamples: [
      {
        input: 'Request: "Analyze the new vendor proposal from CloudServ Inc including financial terms, legal risks, and compare with our existing vendors" Type: vendor_analysis Priority: high',
        output: '{"subtasks":[{"id":"t1","target_agent":"secretary","description":"Extract metadata and key terms from the CloudServ proposal","depends_on":[],"priority":1},{"id":"t2","target_agent":"financial","description":"Analyze financial terms, pricing structure, and budget impact","depends_on":["t1"],"priority":1},{"id":"t3","target_agent":"legal","description":"Assess legal risks, liability terms, and compliance gaps","depends_on":["t1"],"priority":1},{"id":"t4","target_agent":"vendor","description":"Score CloudServ against existing vendor portfolio","depends_on":["t2","t3"],"priority":2}],"executionStrategy":"mixed","expectedTotalTimeMs":15000}',
        explanation: 'Secretary extracts first (no dependencies). Financial and Legal run in parallel (both depend on extraction). Vendor scoring runs last (needs both analyses).',
      },
    ],
    metadata: { ...META, tags: ['decomposition', 'planning', 'manager'], maxTokens: 1500, temperature: 0.3 },
  },

  // ── Result Synthesis ──────────────────────────────────────────────
  {
    id: 'manager-synthesize-results',
    agentType: 'manager',
    category: 'task',
    name: 'Multi-Agent Result Synthesis',
    description: 'Combines outputs from multiple agents into a unified response',
    version: '1.0.0',
    template: `Synthesize these agent results into a single coherent response for the user.

Original request: {{original_request}}

Agent results:
{{agent_results}}

Synthesis rules:
1. Eliminate redundancy — do not repeat the same finding from different agents
2. Resolve conflicts — if agents disagree, note the disagreement and explain
3. Prioritize by severity — lead with critical findings, then high, then informational
4. Cross-reference — note where findings from different agents reinforce each other
5. Create a unified recommendation that considers all perspectives
6. Include an overall confidence score (weighted average of agent confidences)

Output format:
- Executive summary (2-3 sentences)
- Key findings (grouped by theme, not by agent)
- Risk assessment (combined)
- Recommendations (prioritized action list)
- Confidence and caveats`,
    variables: [
      { name: 'original_request', description: 'The original user request', required: true, type: 'string' },
      { name: 'agent_results', description: 'JSON array of agent results with agent type, findings, and confidence', required: true, type: 'json' },
    ],
    metadata: { ...META, tags: ['synthesis', 'multi-agent', 'manager'], maxTokens: 2000, temperature: 0.3 },
  },

  // ── Priority Assessment ───────────────────────────────────────────
  {
    id: 'manager-assess-priority',
    agentType: 'manager',
    category: 'task',
    name: 'Request Priority Assessment',
    description: 'Evaluates the urgency and importance of an incoming request',
    version: '1.0.0',
    template: `Assess the priority of this request.

Request: {{request_description}}
Source: {{request_source}}
Current workload: {{current_queue_size}} pending tasks

Scoring criteria (1-10 each):
- **Urgency**: Is there a deadline? Regulatory requirement? Active negotiation?
- **Financial impact**: What is the potential cost/revenue affected?
- **Legal risk**: Could inaction create legal exposure?
- **Stakeholder importance**: Who is requesting and what is their role?
- **Dependency**: Are other workflows blocked on this?

Output: priority level (critical/high/normal/low), composite score, and reasoning.`,
    variables: [
      { name: 'request_description', description: 'Description of the incoming request', required: true, type: 'string' },
      { name: 'request_source', description: 'Who or what initiated the request', required: true, type: 'string' },
      { name: 'current_queue_size', description: 'Number of tasks currently pending', required: false, defaultValue: '0', type: 'number' },
    ],
    metadata: { ...META, tags: ['priority', 'triage', 'manager'], maxTokens: 800, temperature: 0.2 },
  },
];
