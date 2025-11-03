-- Migration: Initialize Default Agents for Enterprises
-- Creates a function to set up the complete agent system for any enterprise

-- Function to initialize agent system and all default agents for an enterprise
CREATE OR REPLACE FUNCTION initialize_agent_system(p_enterprise_id UUID)
RETURNS TABLE (
  agent_system_id UUID,
  agents_created INTEGER
) AS $$
DECLARE
  v_system_id UUID;
  v_agent_count INTEGER := 0;
BEGIN
  -- Check if agent system already exists for this enterprise
  SELECT id INTO v_system_id
  FROM agent_system
  WHERE enterprise_id = p_enterprise_id;

  -- If no system exists, create it
  IF v_system_id IS NULL THEN
    INSERT INTO agent_system (
      name,
      version,
      is_active,
      config,
      capabilities,
      enterprise_id,
      created_at,
      updated_at
    ) VALUES (
      'Pactwise AI Agent System',
      '1.0.0',
      true,
      '{"mode": "production", "auto_scaling": true}'::jsonb,
      '["document_processing", "financial_analysis", "legal_review", "compliance_monitoring", "vendor_management"]'::jsonb,
      p_enterprise_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_system_id;
  END IF;

  -- Create all default agents if they don't exist
  -- Only insert agents that don't already exist for this enterprise

  -- Manager Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'manager') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'System Manager',
      'manager',
      'System coordination, workflow orchestration, and multi-agent task management',
      true,
      '{}'::jsonb,
      '["workflow_orchestration", "task_prioritization", "system_monitoring"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Theory of Mind Manager
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'theory_of_mind_manager') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Theory of Mind Manager',
      'theory_of_mind_manager',
      'Advanced cognitive reasoning with stakeholder modeling and intent understanding',
      true,
      '{}'::jsonb,
      '["stakeholder_analysis", "intent_recognition", "contextual_orchestration"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Workflow Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'workflow') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Workflow Orchestrator',
      'workflow',
      'Multi-step workflow execution and automation',
      true,
      '{}'::jsonb,
      '["workflow_execution", "process_automation", "step_coordination"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Secretary Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'secretary') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Document Secretary',
      'secretary',
      'Intelligent document processing with automatic metadata extraction and entity recognition',
      true,
      '{}'::jsonb,
      '["document_extraction", "ocr_processing", "entity_recognition"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Continual Secretary
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'continual_secretary') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Continual Learning Secretary',
      'continual_secretary',
      'Self-improving document processing that learns from user corrections and feedback',
      true,
      '{}'::jsonb,
      '["adaptive_learning", "pattern_recognition", "self_optimization"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Metacognitive Secretary
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'metacognitive_secretary') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Metacognitive Secretary',
      'metacognitive_secretary',
      'Self-aware document processing with reasoning traces and confidence scoring',
      true,
      '{}'::jsonb,
      '["confidence_scoring", "reasoning_traces", "quality_assessment"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Legal Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'legal') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Legal Analyst',
      'legal',
      'Contract analysis, legal risk assessment, and compliance validation specialist',
      true,
      '{}'::jsonb,
      '["legal_analysis", "risk_assessment", "clause_extraction"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Compliance Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'compliance') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Compliance Monitor',
      'compliance',
      'Regulatory compliance tracking, audit management, and policy enforcement',
      true,
      '{}'::jsonb,
      '["compliance_monitoring", "audit_management", "policy_enforcement"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Risk Assessment Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'risk_assessment') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Risk Assessment',
      'risk_assessment',
      'Comprehensive risk evaluation and mitigation strategy development',
      true,
      '{}'::jsonb,
      '["risk_evaluation", "mitigation_planning", "risk_monitoring"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Financial Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'financial') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Financial Analyst',
      'financial',
      'Financial risk assessment, cost analysis, and budget impact evaluation',
      true,
      '{}'::jsonb,
      '["financial_analysis", "cost_optimization", "budget_tracking"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Causal Financial Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'causal_financial') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Causal Financial Analyst',
      'causal_financial',
      'Advanced financial analysis with causal inference and root cause identification',
      true,
      '{}'::jsonb,
      '["causal_analysis", "root_cause_detection", "impact_modeling"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Quantum Financial Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'quantum_financial') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Quantum Financial Optimizer',
      'quantum_financial',
      'Quantum-inspired optimization for complex financial scenarios and portfolio management',
      true,
      '{}'::jsonb,
      '["quantum_optimization", "portfolio_management", "scenario_simulation"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Vendor Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'vendor') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Vendor Manager',
      'vendor',
      'Vendor lifecycle management, performance tracking, and SLA monitoring',
      true,
      '{}'::jsonb,
      '["vendor_tracking", "sla_monitoring", "performance_analysis"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Analytics Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'analytics') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Analytics Engine',
      'analytics',
      'Data analysis, trend identification, and predictive insights',
      true,
      '{}'::jsonb,
      '["data_analysis", "trend_detection", "predictive_modeling"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Notifications Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'notifications') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Notification Manager',
      'notifications',
      'Communication and alert management across all channels',
      true,
      '{}'::jsonb,
      '["alert_management", "notification_routing", "communication_coordination"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Data Quality Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'data-quality') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Data Quality Monitor',
      'data-quality',
      'Data validation, quality assurance, integrity checks, and anomaly detection',
      true,
      '{}'::jsonb,
      '["data_validation", "quality_assurance", "anomaly_detection"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Integration Agent
  IF NOT EXISTS (SELECT 1 FROM agents WHERE enterprise_id = p_enterprise_id AND type = 'integration') THEN
    INSERT INTO agents (name, type, description, is_active, config, capabilities, system_id, enterprise_id)
    VALUES (
      'Integration Manager',
      'integration',
      'External system integration, data synchronization, and API management',
      true,
      '{}'::jsonb,
      '["api_integration", "data_sync", "external_systems"]'::jsonb,
      v_system_id,
      p_enterprise_id
    );
    v_agent_count := v_agent_count + 1;
  END IF;

  -- Return results
  RETURN QUERY SELECT v_system_id, v_agent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION initialize_agent_system IS 'Initializes the complete agent system with all 17 default agents for an enterprise. Idempotent - safe to call multiple times.';
