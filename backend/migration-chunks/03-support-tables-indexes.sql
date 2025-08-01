-- ========================================
-- PACTWISE SUPPORT TABLES & INDEXES (Part 3 of 6)
-- Run this AFTER Part 2 in Supabase SQL Editor
-- ========================================

-- Contract Assignments
CREATE TABLE contract_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    assignment_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add partial unique constraint for active assignments
CREATE UNIQUE INDEX idx_contract_assignments_unique_active 
ON contract_assignments(contract_id, user_id, assignment_type) 
WHERE unassigned_at IS NULL;

-- Contract Budget Allocations
CREATE TABLE contract_budget_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    budget_id UUID NOT NULL REFERENCES budgets(id),
    allocation_type VARCHAR(50) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contract_id, budget_id)
);

-- Create indexes for performance
CREATE INDEX idx_enterprises_domain ON enterprises(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_enterprises_parent ON enterprises(parent_enterprise_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_users_auth_id ON users(auth_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_enterprise ON users(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

CREATE INDEX idx_vendors_enterprise ON vendors(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_name_search ON vendors USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_category ON vendors(category, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_performance ON vendors(performance_score DESC, enterprise_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_contracts_enterprise ON contracts(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_status ON contracts(status, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_vendor ON contracts(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_owner ON contracts(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_dates ON contracts(end_date, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_analysis ON contracts(analysis_status, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_search ON contracts USING gin(title gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX idx_budgets_enterprise ON budgets(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_type ON budgets(budget_type, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_status ON budgets(status, enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date, enterprise_id) WHERE deleted_at IS NULL;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_enterprises_updated_at BEFORE UPDATE ON enterprises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();