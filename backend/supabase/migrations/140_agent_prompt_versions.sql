-- Migration 140: Agent Prompt Versions
-- Creates tables for the prompt engineering system:
-- - agent_prompt_versions: Versioned prompt templates with performance metrics
-- - agent_prompt_executions: Execution logs for prompt performance tracking
-- - agent_prompt_ab_tests: A/B testing infrastructure for prompt optimization

-- ── Prompt Versions Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  checksum TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'system',
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  metrics JSONB DEFAULT '{
    "totalUsageCount": 0,
    "successRate": 0,
    "averageLatencyMs": 0,
    "averageInputTokens": 0,
    "averageOutputTokens": 0,
    "averageCost": 0,
    "userSatisfactionScore": null,
    "lastUsedAt": null
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  few_shot_examples JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_agent_type CHECK (agent_type IN (
    'secretary', 'manager', 'financial', 'legal',
    'analytics', 'vendor', 'notifications'
  )),
  CONSTRAINT valid_category CHECK (category IN (
    'system', 'task', 'few-shot', 'chain-of-thought',
    'self-consistency', 'refinement'
  ))
);

-- Indexes for common query patterns
CREATE INDEX idx_prompt_versions_enterprise ON agent_prompt_versions(enterprise_id);
CREATE INDEX idx_prompt_versions_template ON agent_prompt_versions(template_id);
CREATE INDEX idx_prompt_versions_active ON agent_prompt_versions(enterprise_id, template_id, is_active)
  WHERE is_active = true;
CREATE INDEX idx_prompt_versions_agent_type ON agent_prompt_versions(enterprise_id, agent_type);

-- ── Prompt Executions Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_prompt_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES agent_prompt_versions(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  satisfaction_score DECIMAL(3, 2),
  executed_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_satisfaction CHECK (
    satisfaction_score IS NULL OR (satisfaction_score >= 0 AND satisfaction_score <= 1)
  )
);

-- Indexes for execution queries
CREATE INDEX idx_prompt_executions_version ON agent_prompt_executions(version_id);
CREATE INDEX idx_prompt_executions_enterprise ON agent_prompt_executions(enterprise_id);
CREATE INDEX idx_prompt_executions_time ON agent_prompt_executions(executed_at DESC);

-- ── A/B Test Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_prompt_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  variant_a UUID NOT NULL REFERENCES agent_prompt_versions(id),
  variant_b UUID NOT NULL REFERENCES agent_prompt_versions(id),
  traffic_split_percent INTEGER DEFAULT 50,
  status TEXT DEFAULT 'draft',
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  sample_size INTEGER DEFAULT 0,
  confidence_level DECIMAL(3, 2) DEFAULT 0.95,
  winner_version UUID REFERENCES agent_prompt_versions(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  CONSTRAINT valid_traffic_split CHECK (traffic_split_percent >= 0 AND traffic_split_percent <= 100),
  CONSTRAINT different_variants CHECK (variant_a != variant_b)
);

-- Index for A/B test queries
CREATE INDEX idx_ab_tests_enterprise ON agent_prompt_ab_tests(enterprise_id);
CREATE INDEX idx_ab_tests_running ON agent_prompt_ab_tests(enterprise_id, status)
  WHERE status = 'running';

-- ── Row Level Security ──────────────────────────────────────────────

ALTER TABLE agent_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompt_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompt_ab_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: enterprise isolation
CREATE POLICY "Enterprise isolation for prompt versions"
  ON agent_prompt_versions
  FOR ALL
  USING (enterprise_id = (current_setting('app.enterprise_id', true))::uuid);

CREATE POLICY "Enterprise isolation for prompt executions"
  ON agent_prompt_executions
  FOR ALL
  USING (enterprise_id = (current_setting('app.enterprise_id', true))::uuid);

CREATE POLICY "Enterprise isolation for ab tests"
  ON agent_prompt_ab_tests
  FOR ALL
  USING (enterprise_id = (current_setting('app.enterprise_id', true))::uuid);

-- Service role bypass (for backend functions)
CREATE POLICY "Service role full access to prompt versions"
  ON agent_prompt_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to prompt executions"
  ON agent_prompt_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to ab tests"
  ON agent_prompt_ab_tests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Comments ────────────────────────────────────────────────────────

COMMENT ON TABLE agent_prompt_versions IS
  'Versioned prompt templates for the agent system with performance metrics';

COMMENT ON TABLE agent_prompt_executions IS
  'Execution log for prompt performance tracking (success, latency, cost)';

COMMENT ON TABLE agent_prompt_ab_tests IS
  'A/B testing infrastructure for comparing prompt template variations';
