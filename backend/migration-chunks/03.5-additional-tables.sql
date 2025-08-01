-- ========================================
-- PACTWISE ADDITIONAL SUPPORT TABLES (Part 3.5 of 6)
-- Run this AFTER Part 3 in Supabase SQL Editor
-- Creates additional tables needed by business functions
-- ========================================

-- Compliance checks table
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id),
    contract_id UUID REFERENCES contracts(id),
    check_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    passed BOOLEAN,
    issues JSONB DEFAULT '[]',
    severity VARCHAR(20) DEFAULT 'low',
    performed_at TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES users(id),
    next_check_date DATE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_has_target CHECK (vendor_id IS NOT NULL OR contract_id IS NOT NULL)
);

-- Contract approvals table
CREATE TABLE contract_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    approval_type approval_type NOT NULL,
    approver_id UUID NOT NULL REFERENCES users(id),
    status approval_status DEFAULT 'pending',
    comments TEXT,
    conditions JSONB DEFAULT '[]',
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contract_id, approval_type, approver_id)
);

-- Contract status history
CREATE TABLE contract_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    previous_status contract_status,
    new_status contract_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    data JSONB DEFAULT '{}',
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(20) DEFAULT 'immediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Create indexes for performance
CREATE INDEX idx_compliance_checks_vendor ON compliance_checks(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_compliance_checks_contract ON compliance_checks(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_compliance_checks_enterprise ON compliance_checks(enterprise_id);

CREATE INDEX idx_contract_approvals_contract ON contract_approvals(contract_id);
CREATE INDEX idx_contract_approvals_status ON contract_approvals(status) WHERE status = 'pending';

CREATE INDEX idx_contract_status_history_contract ON contract_status_history(contract_id);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_enterprise ON notifications(enterprise_id);

-- Add RLS policies for these tables
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Compliance checks policies
CREATE POLICY "Users can view compliance checks in their enterprise" ON compliance_checks
  FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Managers can create compliance checks" ON compliance_checks
  FOR INSERT WITH CHECK (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

-- Contract approvals policies
CREATE POLICY "Users can view approvals for contracts they can see" ON contract_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_approvals.contract_id 
      AND contracts.enterprise_id = get_current_user_enterprise_id()
    )
  );

CREATE POLICY "Managers can manage approvals" ON contract_approvals
  FOR ALL USING (enterprise_id = get_current_user_enterprise_id() AND check_user_role('manager'));

-- Contract status history policies
CREATE POLICY "Users can view status history for contracts they can see" ON contract_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_status_history.contract_id 
      AND contracts.enterprise_id = get_current_user_enterprise_id()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = get_current_user_id());

-- User notification preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_notification_preferences
  FOR ALL USING (user_id = get_current_user_id());