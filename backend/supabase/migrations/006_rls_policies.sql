-- Enable RLS on all tables
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION auth.user_id() 
RETURNS UUID AS $$
  SELECT auth.uid()
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_enterprise_id() 
RETURNS UUID AS $$
  SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() 
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.has_role(required_role user_role) 
RETURNS BOOLEAN AS $$
DECLARE
  user_role_level INTEGER;
  required_role_level INTEGER;
BEGIN
  -- Define role levels
  CASE auth.user_role()
    WHEN 'owner' THEN user_role_level := 5;
    WHEN 'admin' THEN user_role_level := 4;
    WHEN 'manager' THEN user_role_level := 3;
    WHEN 'user' THEN user_role_level := 2;
    WHEN 'viewer' THEN user_role_level := 1;
    ELSE user_role_level := 0;
  END CASE;
  
  CASE required_role
    WHEN 'owner' THEN required_role_level := 5;
    WHEN 'admin' THEN required_role_level := 4;
    WHEN 'manager' THEN required_role_level := 3;
    WHEN 'user' THEN required_role_level := 2;
    WHEN 'viewer' THEN required_role_level := 1;
    ELSE required_role_level := 0;
  END CASE;
  
  RETURN user_role_level >= required_role_level;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enterprises policies
CREATE POLICY "Users can view their own enterprise" ON enterprises
  FOR SELECT USING (id = auth.user_enterprise_id());

CREATE POLICY "Admins can update their enterprise" ON enterprises
  FOR UPDATE USING (id = auth.user_enterprise_id() AND auth.has_role('admin'));

-- Users policies
CREATE POLICY "Users can view users in their enterprise" ON users
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Admins can manage users in their enterprise" ON users
  FOR ALL USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('admin'));

-- Vendors policies
CREATE POLICY "Users can view vendors in their enterprise" ON vendors
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND deleted_at IS NULL);

CREATE POLICY "Users can create vendors" ON vendors
  FOR INSERT WITH CHECK (enterprise_id = auth.user_enterprise_id() AND auth.has_role('user'));

CREATE POLICY "Users can update vendors" ON vendors
  FOR UPDATE USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('user'));

CREATE POLICY "Managers can delete vendors" ON vendors
  FOR DELETE USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('manager'));

-- Contracts policies
CREATE POLICY "Users can view contracts in their enterprise" ON contracts
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND deleted_at IS NULL);

CREATE POLICY "Users can create contracts" ON contracts
  FOR INSERT WITH CHECK (enterprise_id = auth.user_enterprise_id() AND auth.has_role('user'));

CREATE POLICY "Users can update contracts they own or are assigned to" ON contracts
  FOR UPDATE USING (
    enterprise_id = auth.user_enterprise_id() 
    AND (owner_id = auth.user_id() OR created_by = auth.user_id() OR
         EXISTS (
           SELECT 1 FROM contract_assignments 
           WHERE contract_id = contracts.id 
           AND user_id = auth.user_id() 
           AND is_active = true
         ))
  );

CREATE POLICY "Managers can update any contract" ON contracts
  FOR UPDATE USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('manager'));

CREATE POLICY "Managers can delete contracts" ON contracts
  FOR DELETE USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('manager'));

-- Budgets policies
CREATE POLICY "Users can view budgets in their enterprise" ON budgets
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND deleted_at IS NULL);

CREATE POLICY "Managers can create budgets" ON budgets
  FOR INSERT WITH CHECK (enterprise_id = auth.user_enterprise_id() AND auth.has_role('manager'));

CREATE POLICY "Managers can update budgets" ON budgets
  FOR UPDATE USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('manager'));

CREATE POLICY "Admins can delete budgets" ON budgets
  FOR DELETE USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('admin'));

-- Contract assignments policies
CREATE POLICY "Users can view assignments for contracts they can see" ON contract_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_assignments.contract_id 
      AND contracts.enterprise_id = auth.user_enterprise_id()
    )
  );

CREATE POLICY "Managers can create assignments" ON contract_assignments
  FOR INSERT WITH CHECK (
    auth.has_role('manager') AND
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_assignments.contract_id 
      AND contracts.enterprise_id = auth.user_enterprise_id()
    )
  );

-- AI system policies - FIXED: Strict enterprise isolation
CREATE POLICY "Users can view AI system in their enterprise" ON agent_system
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND enterprise_id IS NOT NULL);

CREATE POLICY "Users can view agents" ON agents
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND enterprise_id IS NOT NULL);

CREATE POLICY "Users can view their agent tasks" ON agent_tasks
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can view insights for their enterprise" ON agent_insights
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can acknowledge insights" ON agent_insights
  FOR UPDATE USING (enterprise_id = auth.user_enterprise_id())
  WITH CHECK (enterprise_id = auth.user_enterprise_id());

-- Chat policies
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Users can create chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (user_id = auth.user_id() AND enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can view messages in their sessions" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can create messages in their sessions" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.user_id()
    )
  );

-- Memory policies
CREATE POLICY "Users can view their own short-term memory" ON short_term_memory
  FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "System can manage short-term memory" ON short_term_memory
  FOR ALL USING (user_id = auth.user_id());

CREATE POLICY "Users can view long-term memory for their enterprise" ON long_term_memory
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

-- Collaboration policies
CREATE POLICY "Users can view presence in their enterprise" ON user_presence
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL USING (user_id = auth.user_id());

CREATE POLICY "Users can view events in their enterprise" ON realtime_events
  FOR SELECT USING (
    enterprise_id = auth.user_enterprise_id() AND
    (is_broadcast = true OR user_id = auth.user_id() OR auth.user_id() = ANY(target_users))
  );

CREATE POLICY "Users can create events" ON realtime_events
  FOR INSERT WITH CHECK (enterprise_id = auth.user_enterprise_id());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.user_id());

CREATE POLICY "Users can view their notification preferences" ON user_notification_preferences
  FOR ALL USING (user_id = auth.user_id());

-- System policies
CREATE POLICY "Users can view audit logs for their enterprise" ON audit_logs
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('admin'));

CREATE POLICY "Admins can view API keys for their enterprise" ON api_keys
  FOR SELECT USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('admin'));

CREATE POLICY "Admins can manage webhooks for their enterprise" ON webhooks
  FOR ALL USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('admin'));

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;