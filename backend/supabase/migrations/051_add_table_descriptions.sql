-- Add comprehensive descriptions to all tables for better documentation
-- This migration adds COMMENT ON TABLE statements for all existing tables

-- Function to safely add table comments
CREATE OR REPLACE FUNCTION add_table_comment(table_name text, description text)
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
        EXECUTE format('COMMENT ON TABLE %I IS %L', table_name, description);
        RAISE NOTICE 'Added description to table: %', table_name;
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORE BUSINESS TABLES
-- ============================================================================

SELECT add_table_comment('enterprises', 'Multi-tenant organizations that own all data. Root entity for data isolation and billing.');
SELECT add_table_comment('users', 'User accounts with authentication, roles, and enterprise association. Supports 5-level role hierarchy.');
SELECT add_table_comment('vendors', 'External suppliers and service providers. Tracks performance, compliance, and risk metrics.');
SELECT add_table_comment('contracts', 'Legal agreements between enterprises and vendors. Full lifecycle management from draft to termination.');
SELECT add_table_comment('budgets', 'Financial allocation and tracking for departments or projects. Monitors spending against limits.');
SELECT add_table_comment('contract_assignments', 'Many-to-many relationship linking users to contracts with specific roles and permissions.');
SELECT add_table_comment('contract_budget_allocations', 'Links contracts to budgets for financial tracking and allocation management.');
SELECT add_table_comment('contract_clauses', 'Individual terms and conditions within contracts. Supports clause-level tracking and analysis.');
SELECT add_table_comment('contract_status_history', 'Audit trail of all contract status changes with timestamps and user attribution.');
SELECT add_table_comment('contract_approvals', 'Workflow for contract approval process. Tracks multi-level approval chains.');
SELECT add_table_comment('contract_extractions', 'AI-extracted data points from contract documents for structured analysis.');
SELECT add_table_comment('contract_templates', 'Reusable contract templates with standard terms and customizable sections.');
SELECT add_table_comment('contract_types', 'Normalized contract type definitions (NDA, MSA, SOW, etc.) for consistent categorization.');
SELECT add_table_comment('vendor_categories', 'Normalized vendor category taxonomy for classification and reporting.');
SELECT add_table_comment('vendor_contacts', 'Contact information for vendor representatives. Supports multiple contacts per vendor.');
SELECT add_table_comment('vendor_documents', 'Document attachments for vendors (certificates, insurance, compliance docs).');
SELECT add_table_comment('vendor_risk_assessments', 'Periodic risk evaluation of vendors across multiple risk dimensions.');
SELECT add_table_comment('vendor_performance_reviews', 'Structured performance evaluations with metrics and scoring.');

-- ============================================================================
-- AI AND AGENT SYSTEM TABLES
-- ============================================================================

SELECT add_table_comment('agent_system', 'Configuration and metadata for the AI agent system. Defines agent types and capabilities.');
SELECT add_table_comment('agents', 'Individual AI agent instances with specific roles (Secretary, Legal, Compliance, etc.).');
SELECT add_table_comment('agent_tasks', 'Asynchronous task queue for agent processing. Supports retry logic and priority scheduling.');
SELECT add_table_comment('agent_insights', 'AI-generated insights and recommendations from agent analysis.');
SELECT add_table_comment('agent_logs', 'Detailed execution logs for agent activities. Used for debugging and audit.');
SELECT add_table_comment('agent_credentials', 'Secure storage for agent authentication tokens and API keys.');
SELECT add_table_comment('agent_permissions', 'Fine-grained permission matrix for agent operations by type and scope.');
SELECT add_table_comment('agent_auth_tokens', 'JWT tokens for agent-to-agent and agent-to-system authentication.');
SELECT add_table_comment('agent_auth_logs', 'Authentication audit trail for agent security monitoring.');
SELECT add_table_comment('agent_validation_errors', 'Capture and tracking of agent validation failures for quality improvement.');
SELECT add_table_comment('agent_trust_relationships', 'Trust scoring between agents for secure multi-agent collaboration.');
SELECT add_table_comment('agent_relationships', 'Graph of agent interactions and dependencies for workflow optimization.');
SELECT add_table_comment('agent_cognitive_states', 'Advanced cognitive modeling for sophisticated agent reasoning.');
SELECT add_table_comment('agent_learning_history', 'Machine learning training history and model versioning.');
SELECT add_table_comment('agent_learning_adjustments', 'Real-time learning parameter adjustments based on performance.');

-- ============================================================================
-- MEMORY AND LEARNING TABLES
-- ============================================================================

SELECT add_table_comment('short_term_memory', 'Temporary memory storage (24-hour TTL) for user-specific context and interactions.');
SELECT add_table_comment('long_term_memory', 'Persistent memory storage with importance scoring and consolidation from short-term.');
SELECT add_table_comment('embeddings', 'Vector embeddings for semantic search across documents and memories.');
SELECT add_table_comment('memory_consolidation_logs', 'Audit trail of memory consolidation processes from short to long-term storage.');
SELECT add_table_comment('swarm_tasks', 'Distributed task coordination for multi-agent swarm intelligence.');
SELECT add_table_comment('swarm_results', 'Aggregated results from swarm agent collaboration.');
SELECT add_table_comment('learning_patterns', 'Identified patterns from continual learning system for improvement.');
SELECT add_table_comment('knowledge_updates', 'Incremental knowledge base updates from learning system discoveries.');

-- ============================================================================
-- DONNA AI SYSTEM TABLES
-- ============================================================================

SELECT add_table_comment('donna_learning_patterns', 'Global learning patterns identified across all enterprises (anonymized).');
SELECT add_table_comment('donna_best_practices', 'Industry best practices extracted from collective usage patterns.');
SELECT add_table_comment('donna_insights_queue', 'Queue of insights pending distribution to relevant enterprises.');
SELECT add_table_comment('donna_feedback_loop', 'User feedback on Donna recommendations for reinforcement learning.');
SELECT add_table_comment('donna_model_versions', 'Version control for Donna AI models with performance metrics.');
SELECT add_table_comment('donna_feature_usage', 'Anonymized feature usage statistics for product improvement.');
SELECT add_table_comment('donna_anomaly_detection', 'Detected anomalies and outliers for security and quality monitoring.');
SELECT add_table_comment('donna_recommendation_history', 'Historical recommendations with outcome tracking for model evaluation.');
SELECT add_table_comment('donna_performance_metrics', 'System-wide performance metrics for Donna AI optimization.');

-- ============================================================================
-- COLLABORATION TABLES
-- ============================================================================

SELECT add_table_comment('chat_sessions', 'Real-time chat sessions between users and AI agents or between users.');
SELECT add_table_comment('chat_messages', 'Individual messages within chat sessions with full conversation history.');
SELECT add_table_comment('collaborative_documents', 'Documents with real-time collaborative editing capabilities.');
SELECT add_table_comment('document_comments', 'Threaded comments and discussions on collaborative documents.');
SELECT add_table_comment('document_suggestions', 'Track changes and suggestions for collaborative document editing.');
SELECT add_table_comment('document_snapshots', 'Point-in-time snapshots of documents for version control.');
SELECT add_table_comment('user_presence', 'Real-time user presence tracking for collaboration features.');
SELECT add_table_comment('realtime_events', 'Event stream for real-time updates across the application.');
SELECT add_table_comment('typing_indicators', 'Real-time typing status for chat and collaborative editing.');

-- ============================================================================
-- NOTIFICATION AND WORKFLOW TABLES
-- ============================================================================

SELECT add_table_comment('notifications', 'User notifications for events, alerts, and system messages.');
SELECT add_table_comment('notification_templates', 'Reusable templates for consistent notification formatting.');
SELECT add_table_comment('user_notification_preferences', 'User-specific notification settings and channel preferences.');
SELECT add_table_comment('workflow_definitions', 'Configurable workflow templates for business processes.');
SELECT add_table_comment('workflow_instances', 'Active workflow executions with state tracking.');
SELECT add_table_comment('workflow_steps', 'Individual steps within workflow instances with status.');
SELECT add_table_comment('workflow_transitions', 'State transition history for workflow audit trail.');

-- ============================================================================
-- FINANCIAL AND PAYMENT TABLES
-- ============================================================================

SELECT add_table_comment('payment_methods', 'Stored payment methods for subscription billing.');
SELECT add_table_comment('payment_method_cards', 'Credit/debit card details for payment methods (PCI compliant storage).');
SELECT add_table_comment('payment_method_bank_accounts', 'Bank account details for ACH/wire transfer payments.');
SELECT add_table_comment('invoices', 'Generated invoices for subscription and usage-based billing.');
SELECT add_table_comment('invoice_items', 'Line items within invoices for detailed billing breakdown.');
SELECT add_table_comment('payments', 'Payment transaction records with gateway references.');
SELECT add_table_comment('payment_intents', 'Stripe payment intent tracking for secure payment processing.');
SELECT add_table_comment('subscriptions', 'Active subscription records with tier and billing cycle.');
SELECT add_table_comment('subscription_items', 'Individual items/features within subscription plans.');
SELECT add_table_comment('subscription_changes', 'History of subscription upgrades, downgrades, and modifications.');
SELECT add_table_comment('billing_alerts', 'Automated alerts for billing events (failures, expirations, limits).');
SELECT add_table_comment('usage_tracking', 'Metered usage tracking for usage-based billing components.');
SELECT add_table_comment('credit_transactions', 'Account credits and adjustments for billing corrections.');

-- ============================================================================
-- SECURITY AND COMPLIANCE TABLES
-- ============================================================================

SELECT add_table_comment('audit_logs', 'Comprehensive audit trail of all system actions for compliance and security.');
SELECT add_table_comment('audit_logs_partitioned', 'Partitioned audit log table for improved query performance on large datasets.');
SELECT add_table_comment('login_attempts', 'Track authentication attempts for security monitoring and rate limiting.');
SELECT add_table_comment('user_sessions', 'Active user sessions with IP tracking and device fingerprinting.');
SELECT add_table_comment('api_keys', 'API keys for programmatic access with scoped permissions.');
SELECT add_table_comment('api_key_usage', 'Usage metrics and rate limiting for API key consumption.');
SELECT add_table_comment('compliance_checks', 'Automated compliance validation results (GDPR, SOC2, HIPAA, etc.).');
SELECT add_table_comment('security_events', 'Security-relevant events for SIEM integration and threat detection.');
SELECT add_table_comment('security_rules', 'Configurable security rules for automated threat response.');
SELECT add_table_comment('security_alerts', 'Generated alerts from security rule violations.');
SELECT add_table_comment('security_metrics', 'Aggregated security metrics for dashboard and reporting.');
SELECT add_table_comment('ip_reputation', 'IP address reputation scoring for fraud prevention.');
SELECT add_table_comment('user_behavior_baselines', 'Normal behavior patterns for anomaly detection.');
SELECT add_table_comment('threat_intelligence', 'External threat intelligence feed integration.');
SELECT add_table_comment('zero_trust_policies', 'Zero-trust security policies for fine-grained access control.');
SELECT add_table_comment('zero_trust_verifications', 'Verification records for zero-trust policy enforcement.');
SELECT add_table_comment('zero_trust_audit', 'Audit trail for zero-trust access decisions.');

-- ============================================================================
-- SYSTEM AND INFRASTRUCTURE TABLES
-- ============================================================================

SELECT add_table_comment('rate_limits', 'Rate limiting counters for API throttling and DDoS protection.');
SELECT add_table_comment('rate_limit_rules', 'Configurable rate limit rules by endpoint and user tier.');
SELECT add_table_comment('rate_limit_requests', 'Individual request tracking for sliding window rate limiting.');
SELECT add_table_comment('rate_limit_violations', 'Rate limit violation records for security monitoring.');
SELECT add_table_comment('rate_limit_metrics', 'Aggregated rate limiting metrics for capacity planning.');
SELECT add_table_comment('analytics_cache', 'Cached analytics results for dashboard performance.');
SELECT add_table_comment('query_metrics', 'Database query performance metrics for optimization.');
SELECT add_table_comment('distributed_traces', 'OpenTelemetry-compatible distributed tracing for request flow.');
SELECT add_table_comment('trace_spans', 'Individual spans within distributed traces.');
SELECT add_table_comment('webhooks', 'Configured webhooks for external system integration.');
SELECT add_table_comment('webhook_deliveries', 'Webhook delivery attempts with retry tracking.');
SELECT add_table_comment('file_metadata', 'Metadata for uploaded files in object storage.');
SELECT add_table_comment('system_health', 'System health metrics for monitoring and alerting.');
SELECT add_table_comment('backup_logs', 'Database backup execution logs with validation status.');
SELECT add_table_comment('data_retention_policies', 'Configurable data retention rules for compliance.');
SELECT add_table_comment('data_deletion_logs', 'Audit trail of data deletion for GDPR compliance.');

-- ============================================================================
-- NORMALIZED STRUCTURE TABLES
-- ============================================================================

SELECT add_table_comment('departments', 'Organizational departments within enterprises for user assignment.');
SELECT add_table_comment('job_titles', 'Standardized job titles for consistent role management.');
SELECT add_table_comment('user_positions', 'Many-to-many relationship between users, departments, and job titles.');
SELECT add_table_comment('addresses', 'Centralized address storage for vendors, contracts, and users.');
SELECT add_table_comment('invitations', 'Pending user invitations with role and expiration tracking.');
SELECT add_table_comment('password_reset_tokens', 'Secure tokens for password reset workflow.');
SELECT add_table_comment('magic_links', 'Passwordless authentication tokens with expiration.');

-- ============================================================================
-- SEARCH AND ANALYTICS TABLES
-- ============================================================================

SELECT add_table_comment('search_indexes', 'Full-text search indexes with ranking algorithms.');
SELECT add_table_comment('search_history', 'User search history for personalization and analytics.');
SELECT add_table_comment('search_suggestions', 'AI-generated search suggestions based on user behavior.');
SELECT add_table_comment('contract_analytics_mv', 'Materialized view for contract analytics dashboard performance.');
SELECT add_table_comment('user_permissions', 'Materialized view of user permissions for RLS optimization.');

-- ============================================================================
-- ADVANCED AI TABLES
-- ============================================================================

SELECT add_table_comment('metacognitive_states', 'Meta-cognitive modeling for advanced AI self-awareness.');
SELECT add_table_comment('metacognitive_goals', 'Goal hierarchy for autonomous agent decision-making.');
SELECT add_table_comment('metacognitive_evaluations', 'Self-evaluation results for AI performance improvement.');
SELECT add_table_comment('causal_models', 'Causal inference models for predictive analytics.');
SELECT add_table_comment('causal_links', 'Identified causal relationships in business data.');
SELECT add_table_comment('causal_interventions', 'Simulated interventions for what-if analysis.');
SELECT add_table_comment('causal_evidence', 'Statistical evidence supporting causal relationships.');
SELECT add_table_comment('theory_of_mind_models', 'Models of user mental states for personalized AI interaction.');
SELECT add_table_comment('entity_mental_states', 'Inferred mental states of system entities.');
SELECT add_table_comment('interaction_predictions', 'Predicted user behaviors based on theory of mind.');
SELECT add_table_comment('belief_updates', 'Updates to entity belief models based on observations.');
SELECT add_table_comment('quantum_optimization_tasks', 'Tasks suitable for quantum-inspired optimization algorithms.');
SELECT add_table_comment('quantum_solutions', 'Solutions from quantum optimization algorithms.');
SELECT add_table_comment('quantum_metrics', 'Performance metrics for quantum algorithm evaluation.');

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_table_comment(text, text);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully processed table descriptions';
END $$;