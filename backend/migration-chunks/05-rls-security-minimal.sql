-- ========================================
-- PACTWISE MINIMAL RLS SECURITY POLICIES (Part 5 of 6)
-- Run this AFTER Part 4 in Supabase SQL Editor
-- Only core business tables with guaranteed enterprise_id columns
-- ========================================

-- Enable RLS on core business tables only
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Enterprises policies
CREATE POLICY "Users can view their own enterprise" ON enterprises
  FOR SELECT USING (id = get_current_user_enterprise_id());

CREATE POLICY "Admins can update their enterprise" ON enterprises
  FOR UPDATE USING (id = get_current_user_enterprise_id() AND check_user_role('admin'));

-- Users policies
CREATE POLICY "Users can view users in their enterprise" ON users
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Admins can manage users in their enterprise" ON users
  FOR ALL USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('admin'));

-- Vendors policies
CREATE POLICY "Users can view vendors in their enterprise" ON vendors
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id() AND deleted_at IS NULL);

CREATE POLICY "Users can create vendors" ON vendors
  FOR INSERT WITH CHECK (enterprise_id = get_current_user_enterprise_id() AND check_user_role('user'));

CREATE POLICY "Users can update vendors" ON vendors
  FOR UPDATE USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('user'));

CREATE POLICY "Managers can delete vendors" ON vendors
  FOR DELETE USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

-- Contracts policies
CREATE POLICY "Users can view contracts in their enterprise" ON contracts
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id() AND deleted_at IS NULL);

CREATE POLICY "Users can create contracts" ON contracts
  FOR INSERT WITH CHECK (enterprise_id = get_current_user_enterprise_id() AND check_user_role('user'));

CREATE POLICY "Users can update contracts they own or are assigned to" ON contracts
  FOR UPDATE USING (
    enterprise_id = get_current_user_enterprise_id() 
    AND (owner_id = get_current_user_id() OR created_by = get_current_user_id() OR
         EXISTS (
           SELECT 1 FROM contract_assignments 
           WHERE contract_id = contracts.id 
           AND user_id = get_current_user_id() 
           AND is_active = true
         ))
  );

CREATE POLICY "Managers can update any contract" ON contracts
  FOR UPDATE USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

CREATE POLICY "Managers can delete contracts" ON contracts
  FOR DELETE USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

-- Budgets policies
CREATE POLICY "Users can view budgets in their enterprise" ON budgets
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id() AND deleted_at IS NULL);

CREATE POLICY "Managers can create budgets" ON budgets
  FOR INSERT WITH CHECK (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

CREATE POLICY "Managers can update budgets" ON budgets
  FOR UPDATE USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

CREATE POLICY "Admins can delete budgets" ON budgets
  FOR DELETE USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('admin'));

-- Contract assignments policies
CREATE POLICY "Users can view assignments for contracts they can see" ON contract_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_assignments.contract_id 
      AND contracts.enterprise_id = get_current_user_enterprise_id()
    )
  );

CREATE POLICY "Managers can create assignments" ON contract_assignments
  FOR INSERT WITH CHECK (
    check_user_role('manager') AND
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_assignments.contract_id 
      AND contracts.enterprise_id = get_current_user_enterprise_id()
    )
  );

-- AI system policies
CREATE POLICY "Users can view agents" ON agents
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id() AND enterprise_id IS NOT NULL);

CREATE POLICY "Users can view their agent tasks" ON agent_tasks
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can view insights for their enterprise" ON agent_insights
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can acknowledge insights" ON agent_insights
  FOR UPDATE USING (enterprise_id = get_current_user_enterprise_id())
  WITH CHECK (enterprise_id = get_current_user_enterprise_id());

-- Contract clauses policies
CREATE POLICY "Users can view contract clauses in their enterprise" ON contract_clauses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_clauses.contract_id 
      AND contracts.enterprise_id = get_current_user_enterprise_id()
    )
  );

-- Chat policies
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "Users can create chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (user_id = get_current_user_id() AND enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can view messages in their sessions" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = get_current_user_id()
    )
  );

CREATE POLICY "Users can create messages in their sessions" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = get_current_user_id()
    )
  );

-- Memory policies
CREATE POLICY "Users can view their own short-term memory" ON short_term_memory
  FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "System can manage short-term memory" ON short_term_memory
  FOR ALL USING (user_id = get_current_user_id());

CREATE POLICY "Users can view long-term memory for their enterprise" ON long_term_memory
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

-- Embeddings policies
CREATE POLICY "Users can view embeddings for their enterprise" ON embeddings
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;