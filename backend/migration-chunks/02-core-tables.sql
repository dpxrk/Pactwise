-- ========================================
-- PACTWISE CORE TABLES (Part 2 of 6)
-- Run this AFTER Part 1 in Supabase SQL Editor
-- ========================================

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