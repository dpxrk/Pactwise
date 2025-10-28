-- Migration: 056_comprehensive_industry_benchmarks.sql
-- Description: Comprehensive industry benchmark system with real 2024-2025 market data
-- Created: 2025-01-17

-- ================================================================
-- MASTER INDUSTRY BENCHMARKS TABLE
-- ================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS learning_from_demo CASCADE;
DROP TABLE IF EXISTS demo_data_scenarios CASCADE;
DROP TABLE IF EXISTS industry_contract_templates CASCADE;
DROP TABLE IF EXISTS industry_benchmarks_master CASCADE;

-- Master industry benchmark table with precise 2024-2025 data
CREATE TABLE industry_benchmarks_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry VARCHAR(100) NOT NULL,
    sub_industry VARCHAR(100),
    metric_category VARCHAR(100) NOT NULL CHECK (metric_category IN (
        'contract', 'vendor', 'compliance', 'spend', 'operations', 
        'pricing', 'staffing', 'market_size', 'performance', 'risk'
    )),
    metric_name VARCHAR(200) NOT NULL,
    metric_value JSONB NOT NULL,
    
    -- Percentile distributions from real market data
    p10_value DECIMAL,
    p25_value DECIMAL,
    p50_value DECIMAL,  -- Median
    p75_value DECIMAL,
    p90_value DECIMAL,
    p95_value DECIMAL,
    
    -- Statistical measures
    mean_value DECIMAL,
    std_deviation DECIMAL,
    sample_size INTEGER,
    
    -- Context
    unit VARCHAR(50),
    currency VARCHAR(10),
    time_period VARCHAR(50),
    geographic_region VARCHAR(100),
    company_size_segment VARCHAR(50) CHECK (company_size_segment IN (
        'All', 'Startup', 'SMB', 'Midmarket', 'Enterprise', NULL
    )),
    
    -- Metadata
    source VARCHAR(500),
    source_url TEXT,
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    effective_date DATE NOT NULL,
    expires_date DATE,
    last_validated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique metrics per industry/category/time period
    CONSTRAINT unique_industry_metric UNIQUE (
        industry, sub_industry, metric_category, metric_name, 
        time_period, geographic_region, company_size_segment
    )
);

-- ================================================================
-- INDUSTRY CONTRACT TEMPLATES
-- ================================================================

-- Industry-specific contract templates with real-world terms
CREATE TABLE industry_contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry VARCHAR(100) NOT NULL,
    sub_industry VARCHAR(100),
    contract_type VARCHAR(100) NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    template_version VARCHAR(20) DEFAULT '1.0',
    
    -- Detailed contract structure
    standard_clauses JSONB NOT NULL,
    mandatory_clauses JSONB,
    optional_clauses JSONB,
    prohibited_clauses JSONB,
    negotiable_terms JSONB,
    
    -- Financial parameters
    typical_value_range JSONB,
    payment_terms JSONB,
    pricing_models JSONB,
    discount_structures JSONB,
    escalation_clauses JSONB,
    
    -- Duration and renewals
    typical_duration_days INTEGER,
    min_duration_days INTEGER,
    max_duration_days INTEGER,
    renewal_terms JSONB,
    termination_clauses JSONB,
    notice_periods JSONB,
    
    -- Compliance requirements
    required_compliance TEXT[],
    regulatory_references JSONB,
    audit_requirements JSONB,
    certification_requirements TEXT[],
    
    -- Risk factors
    common_risks JSONB,
    mitigation_strategies JSONB,
    liability_caps JSONB,
    indemnification_terms JSONB,
    insurance_requirements JSONB,
    
    -- Performance metrics
    sla_requirements JSONB,
    kpi_metrics JSONB,
    penalty_structures JSONB,
    incentive_structures JSONB,
    
    -- Additional metadata
    geographic_applicability TEXT[],
    language_requirements TEXT[],
    governing_law VARCHAR(100),
    dispute_resolution JSONB,
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_template UNIQUE (industry, contract_type, template_name, template_version)
);

-- ================================================================
-- DEMO DATA SCENARIOS
-- ================================================================

-- Realistic demo data configurations per industry
CREATE TABLE demo_data_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name VARCHAR(200) NOT NULL UNIQUE,
    scenario_description TEXT,
    industry VARCHAR(100) NOT NULL,
    sub_industry VARCHAR(100),
    
    -- Company profile
    company_profile JSONB NOT NULL, -- Size, age, location, revenue, employees
    market_segment VARCHAR(50),
    maturity_level VARCHAR(50) CHECK (maturity_level IN (
        'startup', 'growth', 'mature', 'enterprise'
    )),
    
    -- Contract generation parameters
    contract_distribution JSONB NOT NULL, -- Types and quantities
    contract_volume_range JSONB,
    vendor_distribution JSONB,
    vendor_count_range JSONB,
    spend_distribution JSONB,
    budget_allocation JSONB,
    
    -- Temporal patterns
    seasonality_factors JSONB,
    growth_trajectory JSONB,
    market_conditions JSONB,
    historical_months INTEGER DEFAULT 24,
    
    -- Performance scenarios
    compliance_scores JSONB,
    risk_profiles JSONB,
    optimization_opportunities JSONB,
    value_erosion_factors JSONB,
    
    -- Behavioral patterns
    negotiation_success_rate DECIMAL(3,2),
    renewal_rate DECIMAL(3,2),
    early_termination_rate DECIMAL(3,2),
    amendment_frequency DECIMAL,
    
    -- Demo configuration
    complexity_level VARCHAR(20) CHECK (complexity_level IN (
        'simple', 'moderate', 'complex', 'comprehensive'
    )),
    generation_time_estimate INTEGER, -- seconds
    data_points_count INTEGER,
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- LEARNING FROM DEMO DATA
-- ================================================================

-- Track how demo data compares to actual customer data for continuous improvement
CREATE TABLE learning_from_demo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    industry VARCHAR(100) NOT NULL,
    sub_industry VARCHAR(100),
    
    -- Comparison metrics
    metric_category VARCHAR(100) NOT NULL,
    metric_name VARCHAR(200) NOT NULL,
    demo_value DECIMAL,
    actual_value DECIMAL,
    variance DECIMAL GENERATED ALWAYS AS (
        CASE 
            WHEN demo_value = 0 THEN NULL
            ELSE ABS(actual_value - demo_value) / demo_value
        END
    ) STORED,
    variance_direction VARCHAR(10) GENERATED ALWAYS AS (
        CASE 
            WHEN actual_value > demo_value THEN 'higher'
            WHEN actual_value < demo_value THEN 'lower'
            ELSE 'equal'
        END
    ) STORED,
    
    -- Insights and actions
    insight_generated TEXT,
    confidence_score DECIMAL(3,2),
    action_suggested JSONB,
    action_taken JSONB,
    outcome JSONB,
    outcome_success BOOLEAN,
    
    -- Metadata
    comparison_date DATE DEFAULT CURRENT_DATE,
    data_quality_score DECIMAL(3,2),
    sample_size INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Industry benchmarks indexes
CREATE INDEX idx_benchmarks_industry ON industry_benchmarks_master(industry);
CREATE INDEX idx_benchmarks_category ON industry_benchmarks_master(metric_category);
CREATE INDEX idx_benchmarks_metric ON industry_benchmarks_master(metric_name);
CREATE INDEX idx_benchmarks_dates ON industry_benchmarks_master(effective_date, expires_date);
CREATE INDEX idx_benchmarks_region ON industry_benchmarks_master(geographic_region);
CREATE INDEX idx_benchmarks_size ON industry_benchmarks_master(company_size_segment);
CREATE INDEX idx_benchmarks_confidence ON industry_benchmarks_master(confidence_level DESC);

-- Contract templates indexes
CREATE INDEX idx_templates_industry ON industry_contract_templates(industry);
CREATE INDEX idx_templates_type ON industry_contract_templates(contract_type);
CREATE INDEX idx_templates_active ON industry_contract_templates(active) WHERE active = true;

-- Demo scenarios indexes
CREATE INDEX idx_scenarios_industry ON demo_data_scenarios(industry);
CREATE INDEX idx_scenarios_active ON demo_data_scenarios(active) WHERE active = true;
CREATE INDEX idx_scenarios_complexity ON demo_data_scenarios(complexity_level);

-- Learning indexes
CREATE INDEX idx_learning_enterprise ON learning_from_demo(enterprise_id);
CREATE INDEX idx_learning_industry ON learning_from_demo(industry);
CREATE INDEX idx_learning_metric ON learning_from_demo(metric_category, metric_name);
CREATE INDEX idx_learning_variance ON learning_from_demo(variance) WHERE variance IS NOT NULL;
CREATE INDEX idx_learning_date ON learning_from_demo(comparison_date DESC);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS
ALTER TABLE industry_benchmarks_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_data_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_from_demo ENABLE ROW LEVEL SECURITY;

-- Benchmarks and templates are public read (industry data)
CREATE POLICY "Public read access to benchmarks"
    ON industry_benchmarks_master FOR SELECT
    USING (true);

CREATE POLICY "Public read access to templates"
    ON industry_contract_templates FOR SELECT
    USING (active = true);

CREATE POLICY "Public read access to demo scenarios"
    ON demo_data_scenarios FOR SELECT
    USING (active = true);

-- Learning data is enterprise-specific
CREATE POLICY "Enterprises can view their own learning data"
    ON learning_from_demo FOR SELECT
    USING (enterprise_id IN (
        SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
    ));

CREATE POLICY "Enterprises can insert their own learning data"
    ON learning_from_demo FOR INSERT
    WITH CHECK (enterprise_id IN (
        SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
    ));

-- Service role has full access
CREATE POLICY "Service role full access to benchmarks"
    ON industry_benchmarks_master FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to templates"
    ON industry_contract_templates FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to scenarios"
    ON demo_data_scenarios FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to learning"
    ON learning_from_demo FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ================================================================
-- FUNCTIONS FOR BENCHMARK OPERATIONS
-- ================================================================

-- Function to get industry benchmarks with percentile context
CREATE OR REPLACE FUNCTION get_industry_benchmarks(
    p_industry VARCHAR,
    p_metric_category VARCHAR DEFAULT NULL,
    p_company_size VARCHAR DEFAULT NULL,
    p_region VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    metric_name VARCHAR,
    metric_category VARCHAR,
    current_value DECIMAL,
    p25 DECIMAL,
    p50 DECIMAL,
    p75 DECIMAL,
    p90 DECIMAL,
    unit VARCHAR,
    confidence DECIMAL,
    source VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ibm.metric_name,
        ibm.metric_category,
        COALESCE(ibm.mean_value, ibm.p50_value) as current_value,
        ibm.p25_value,
        ibm.p50_value,
        ibm.p75_value,
        ibm.p90_value,
        ibm.unit,
        ibm.confidence_level,
        ibm.source
    FROM industry_benchmarks_master ibm
    WHERE ibm.industry = p_industry
        AND (p_metric_category IS NULL OR ibm.metric_category = p_metric_category)
        AND (p_company_size IS NULL OR ibm.company_size_segment = p_company_size OR ibm.company_size_segment = 'All')
        AND (p_region IS NULL OR ibm.geographic_region = p_region OR ibm.geographic_region = 'Global')
        AND CURRENT_DATE BETWEEN ibm.effective_date AND COALESCE(ibm.expires_date, CURRENT_DATE + INTERVAL '1 year')
    ORDER BY ibm.metric_category, ibm.metric_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to compare company metrics against benchmarks
CREATE OR REPLACE FUNCTION compare_against_benchmarks(
    p_enterprise_id UUID,
    p_metric_name VARCHAR,
    p_value DECIMAL
)
RETURNS TABLE (
    percentile INTEGER,
    vs_median DECIMAL,
    vs_best_in_class DECIMAL,
    improvement_potential DECIMAL,
    industry_position VARCHAR
) AS $$
DECLARE
    v_industry VARCHAR;
    v_company_size VARCHAR;
    v_benchmark RECORD;
BEGIN
    -- Get company's industry and size
    SELECT industry, company_size 
    INTO v_industry, v_company_size
    FROM enterprises 
    WHERE id = p_enterprise_id;
    
    -- Get relevant benchmark
    SELECT * INTO v_benchmark
    FROM industry_benchmarks_master
    WHERE industry = v_industry
        AND metric_name = p_metric_name
        AND (company_size_segment = v_company_size OR company_size_segment = 'All')
        AND CURRENT_DATE BETWEEN effective_date AND COALESCE(expires_date, CURRENT_DATE + INTERVAL '1 year')
    ORDER BY company_size_segment = v_company_size DESC
    LIMIT 1;
    
    IF v_benchmark IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT
        CASE
            WHEN p_value <= v_benchmark.p10_value THEN 10
            WHEN p_value <= v_benchmark.p25_value THEN 25
            WHEN p_value <= v_benchmark.p50_value THEN 50
            WHEN p_value <= v_benchmark.p75_value THEN 75
            WHEN p_value <= v_benchmark.p90_value THEN 90
            ELSE 95
        END as percentile,
        ROUND(((p_value - v_benchmark.p50_value) / NULLIF(v_benchmark.p50_value, 0)) * 100, 2) as vs_median,
        ROUND(((p_value - v_benchmark.p10_value) / NULLIF(v_benchmark.p10_value, 0)) * 100, 2) as vs_best_in_class,
        GREATEST(0, ROUND(((p_value - v_benchmark.p25_value) / NULLIF(p_value, 0)) * 100, 2)) as improvement_potential,
        CASE
            WHEN p_value <= v_benchmark.p25_value THEN 'Top Performer'
            WHEN p_value <= v_benchmark.p50_value THEN 'Above Average'
            WHEN p_value <= v_benchmark.p75_value THEN 'Below Average'
            ELSE 'Needs Improvement'
        END as industry_position;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to generate demo data based on scenario
CREATE OR REPLACE FUNCTION generate_demo_data(
    p_scenario_name VARCHAR,
    p_enterprise_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_scenario RECORD;
    v_result JSONB;
BEGIN
    -- Get scenario configuration
    SELECT * INTO v_scenario
    FROM demo_data_scenarios
    WHERE scenario_name = p_scenario_name AND active = true;
    
    IF v_scenario IS NULL THEN
        RAISE EXCEPTION 'Scenario % not found', p_scenario_name;
    END IF;
    
    -- This would typically call an edge function for complex generation
    -- For now, return the scenario configuration
    v_result = jsonb_build_object(
        'scenario', v_scenario.scenario_name,
        'industry', v_scenario.industry,
        'profile', v_scenario.company_profile,
        'contracts', v_scenario.contract_distribution,
        'vendors', v_scenario.vendor_distribution,
        'message', 'Call demo-data-generator edge function for full generation'
    );
    
    -- Log the generation for learning
    INSERT INTO learning_from_demo (
        enterprise_id,
        industry,
        metric_category,
        metric_name,
        demo_value,
        actual_value,
        insight_generated
    ) VALUES (
        p_enterprise_id,
        v_scenario.industry,
        'generation',
        'scenario_used',
        1,
        1,
        'Demo data generated using scenario: ' || p_scenario_name
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update benchmarks from learning
CREATE OR REPLACE FUNCTION update_benchmarks_from_learning()
RETURNS void AS $$
BEGIN
    -- Update benchmark confidence based on actual data variance
    UPDATE industry_benchmarks_master b
    SET 
        confidence_level = CASE 
            WHEN avg_variance < 0.1 THEN LEAST(b.confidence_level + 0.05, 0.99)
            WHEN avg_variance > 0.3 THEN GREATEST(b.confidence_level - 0.05, 0.50)
            ELSE b.confidence_level
        END,
        last_validated = NOW()
    FROM (
        SELECT 
            industry,
            metric_name,
            AVG(variance) as avg_variance
        FROM learning_from_demo
        WHERE created_at > NOW() - INTERVAL '30 days'
            AND variance IS NOT NULL
        GROUP BY industry, metric_name
    ) l
    WHERE b.industry = l.industry 
        AND b.metric_name = l.metric_name;
    
    -- Log the update
    RAISE NOTICE 'Updated benchmark confidence levels based on % learning records', 
        (SELECT COUNT(*) FROM learning_from_demo WHERE created_at > NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_benchmarks_timestamp
    BEFORE UPDATE ON industry_benchmarks_master
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_templates_timestamp
    BEFORE UPDATE ON industry_contract_templates
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_scenarios_timestamp
    BEFORE UPDATE ON demo_data_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_learning_timestamp
    BEFORE UPDATE ON learning_from_demo
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE industry_benchmarks_master IS 'Comprehensive industry benchmarks with real 2024-2025 market data';
COMMENT ON TABLE industry_contract_templates IS 'Industry-specific contract templates with standard terms and clauses';
COMMENT ON TABLE demo_data_scenarios IS 'Pre-configured demo data generation scenarios by industry and company type';
COMMENT ON TABLE learning_from_demo IS 'Tracks variance between demo data and actual customer data for continuous improvement';

COMMENT ON FUNCTION get_industry_benchmarks IS 'Retrieve industry benchmarks with percentile distributions';
COMMENT ON FUNCTION compare_against_benchmarks IS 'Compare company metrics against industry benchmarks';
COMMENT ON FUNCTION generate_demo_data IS 'Generate demo data based on pre-configured scenarios';
COMMENT ON FUNCTION update_benchmarks_from_learning IS 'Update benchmark confidence based on actual customer data';