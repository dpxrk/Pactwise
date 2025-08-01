-- Enterprises table (multi-tenant root)
CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(50),
    contract_volume INTEGER DEFAULT 0,
    primary_use_case TEXT,
    parent_enterprise_id UUID REFERENCES enterprises(id),
    is_parent_organization BOOLEAN DEFAULT false,
    allow_child_organizations BOOLEAN DEFAULT false,
    access_pin VARCHAR(10),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL, -- Supabase Auth UUID
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'viewer',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    department VARCHAR(100),
    title VARCHAR(100),
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category vendor_category NOT NULL,
    status vendor_status DEFAULT 'active',
    website VARCHAR(255),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    performance_score DECIMAL(3,2) DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 5),
    compliance_score DECIMAL(3,2) DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 5),
    total_contract_value DECIMAL(15,2) DEFAULT 0,
    active_contracts INTEGER DEFAULT 0,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(name, enterprise_id, deleted_at)
);

-- Contracts table
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    status contract_status DEFAULT 'draft',
    contract_type VARCHAR(100),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    storage_id TEXT, -- Supabase Storage reference
    start_date DATE,
    end_date DATE,
    value DECIMAL(15,2),
    is_auto_renew BOOLEAN DEFAULT false,
    notes TEXT,
    vendor_id UUID REFERENCES vendors(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    owner_id UUID REFERENCES users(id),
    department_id VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified_by UUID REFERENCES users(id),
    
    -- AI Extracted Fields
    extracted_parties JSONB DEFAULT '[]',
    extracted_address TEXT,
    extracted_start_date DATE,
    extracted_end_date DATE,
    extracted_payment_schedule JSONB DEFAULT '[]',
    extracted_pricing JSONB DEFAULT '{}',
    extracted_scope TEXT,
    extracted_key_terms JSONB DEFAULT '[]',
    
    -- Analysis Fields
    analysis_status analysis_status DEFAULT 'pending',
    analysis_error TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Budgets table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    budget_type budget_type NOT NULL,
    total_budget DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    committed_amount DECIMAL(15,2) DEFAULT 0,
    status budget_status DEFAULT 'healthy',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    department VARCHAR(100),
    owner_id UUID REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    parent_budget_id UUID REFERENCES budgets(id),
    alerts JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

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

CREATE UNIQUE INDEX idx_unique_active_assignment ON contract_assignments(contract_id, user_id, assignment_type) WHERE unassigned_at IS NULL;

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