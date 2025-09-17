-- ================================================================
-- LOAD ALL INDUSTRY BENCHMARK SEED DATA
-- This script loads comprehensive industry benchmarks for all sectors
-- Run this after migrations to populate benchmark data
-- ================================================================

-- Load benchmarks in order
\echo 'Loading Technology sector benchmarks...'
\i industry-benchmarks/001_technology_benchmarks.sql

\echo 'Loading Healthcare sector benchmarks...'
\i industry-benchmarks/002_healthcare_benchmarks.sql

\echo 'Loading Financial Services sector benchmarks...'
\i industry-benchmarks/003_financial_services_benchmarks.sql

\echo 'Loading Manufacturing sector benchmarks...'
\i industry-benchmarks/004_manufacturing_benchmarks.sql

\echo 'Loading Retail/E-commerce sector benchmarks...'
\i industry-benchmarks/005_retail_ecommerce_benchmarks.sql

\echo 'Loading Government sector benchmarks...'
\i industry-benchmarks/006_government_benchmarks.sql

-- ================================================================
-- CREATE DEMO SCENARIOS
-- These are pre-configured scenarios for quick demo data generation
-- ================================================================

\echo 'Creating demo data scenarios...'

-- Technology Scenarios
INSERT INTO demo_data_scenarios (
    scenario_name, scenario_description, industry, sub_industry,
    company_profile, market_segment, maturity_level,
    contract_distribution, vendor_distribution, spend_distribution,
    seasonality_factors, growth_trajectory, historical_months,
    compliance_scores, risk_profiles, optimization_opportunities,
    negotiation_success_rate, renewal_rate, early_termination_rate,
    complexity_level, generation_time_estimate, data_points_count
) VALUES
-- Technology Startup Scenario
('tech_startup_growth', 
 'Fast-growing B2B SaaS startup with 18 months of history',
 'Technology', 'SaaS',
 '{"size": "startup", "employees": 25, "revenue": 2000000, "age_months": 18, "funding": "Series A"}',
 'B2B', 'startup',
 '{"saas": 0.7, "services": 0.2, "infrastructure": 0.1}',
 '{"software": 0.6, "services": 0.3, "hardware": 0.1}',
 '{"software": 0.65, "personnel": 0.20, "infrastructure": 0.15}',
 '{"q1": 0.9, "q2": 1.0, "q3": 1.1, "q4": 1.2}',
 '{"monthly_growth": 0.15, "type": "exponential"}',
 18,
 '{"average": 82, "range": [70, 95]}',
 '{"low": 0.6, "medium": 0.3, "high": 0.1}',
 '{"license_consolidation": 0.35, "cost_reduction": 0.25, "compliance_improvement": 0.15}',
 0.65, 0.75, 0.05,
 'moderate', 30, 150),

-- Enterprise Technology Company
('tech_enterprise_mature',
 'Established enterprise technology company with comprehensive vendor ecosystem',
 'Technology', 'Enterprise Software',
 '{"size": "enterprise", "employees": 5000, "revenue": 500000000, "age_months": 120}',
 'B2B', 'enterprise',
 '{"saas": 0.5, "services": 0.3, "infrastructure": 0.15, "hardware": 0.05}',
 '{"software": 0.4, "services": 0.35, "infrastructure": 0.15, "hardware": 0.1}',
 '{"software": 0.45, "personnel": 0.30, "infrastructure": 0.20, "other": 0.05}',
 '{"q1": 0.95, "q2": 0.98, "q3": 1.02, "q4": 1.05}',
 '{"monthly_growth": 0.02, "type": "linear"}',
 24,
 '{"average": 91, "range": [85, 98]}',
 '{"low": 0.8, "medium": 0.15, "high": 0.05}',
 '{"vendor_consolidation": 0.20, "automation": 0.30, "risk_mitigation": 0.25}',
 0.85, 0.90, 0.02,
 'comprehensive', 120, 2000),

-- Healthcare Hospital Network
('healthcare_hospital_network',
 'Multi-location hospital network with complex compliance requirements',
 'Healthcare', 'Provider Services',
 '{"size": "enterprise", "type": "hospital_network", "beds": 2000, "locations": 8, "revenue": 1000000000}',
 'Healthcare Provider', 'mature',
 '{"medical_devices": 0.25, "pharma": 0.20, "services": 0.30, "it": 0.15, "facilities": 0.10}',
 '{"medical": 0.45, "pharma": 0.20, "services": 0.20, "technology": 0.15}',
 '{"clinical": 0.40, "pharma": 0.25, "operations": 0.20, "technology": 0.15}',
 '{"q1": 1.0, "q2": 1.0, "q3": 1.0, "q4": 1.0}',
 '{"monthly_growth": 0.01, "type": "stable"}',
 24,
 '{"average": 94, "range": [90, 99]}',
 '{"low": 0.7, "medium": 0.25, "high": 0.05}',
 '{"supply_chain_optimization": 0.30, "compliance_automation": 0.25, "cost_reduction": 0.20}',
 0.75, 0.85, 0.03,
 'complex', 90, 1500),

-- Financial Services Fintech
('fintech_baas_startup',
 'Banking-as-a-Service fintech startup with rapid growth',
 'Financial Services', 'Fintech',
 '{"size": "startup", "type": "baas", "employees": 50, "revenue": 10000000, "age_months": 24}',
 'Fintech', 'growth',
 '{"banking_services": 0.4, "technology": 0.35, "compliance": 0.25}',
 '{"financial_services": 0.5, "technology": 0.35, "compliance": 0.15}',
 '{"technology": 0.40, "compliance": 0.30, "operations": 0.20, "marketing": 0.10}',
 '{"q1": 0.85, "q2": 0.95, "q3": 1.05, "q4": 1.15}',
 '{"monthly_growth": 0.20, "type": "exponential"}',
 24,
 '{"average": 88, "range": [80, 95]}',
 '{"low": 0.5, "medium": 0.35, "high": 0.15}',
 '{"regulatory_compliance": 0.35, "cost_optimization": 0.25, "risk_management": 0.20}',
 0.70, 0.80, 0.08,
 'moderate', 45, 250),

-- Manufacturing Automotive
('manufacturing_automotive',
 'Automotive parts manufacturer with complex supply chain',
 'Manufacturing', 'Automotive',
 '{"size": "midmarket", "type": "tier1_supplier", "employees": 500, "revenue": 100000000}',
 'Automotive', 'mature',
 '{"suppliers": 0.60, "logistics": 0.20, "services": 0.15, "equipment": 0.05}',
 '{"raw_materials": 0.40, "components": 0.30, "logistics": 0.20, "services": 0.10}',
 '{"materials": 0.55, "labor": 0.25, "logistics": 0.15, "overhead": 0.05}',
 '{"q1": 0.90, "q2": 1.05, "q3": 1.10, "q4": 0.95}',
 '{"monthly_growth": 0.005, "type": "cyclical"}',
 24,
 '{"average": 86, "range": [80, 92]}',
 '{"low": 0.6, "medium": 0.30, "high": 0.10}',
 '{"supply_chain_resilience": 0.30, "inventory_optimization": 0.25, "quality_improvement": 0.20}',
 0.75, 0.88, 0.04,
 'complex', 60, 800),

-- Retail E-commerce
('ecommerce_marketplace',
 'E-commerce marketplace with dropshipping and fulfillment',
 'E-commerce', 'Marketplace',
 '{"size": "midmarket", "type": "marketplace", "employees": 100, "revenue": 50000000, "sellers": 500}',
 'E-commerce', 'growth',
 '{"dropshipping": 0.30, "wholesale": 0.25, "fulfillment": 0.20, "technology": 0.15, "marketing": 0.10}',
 '{"suppliers": 0.40, "fulfillment": 0.25, "technology": 0.20, "marketing": 0.15}',
 '{"inventory": 0.35, "fulfillment": 0.25, "technology": 0.20, "marketing": 0.15, "operations": 0.05}',
 '{"q1": 0.80, "q2": 0.90, "q3": 0.95, "q4": 1.35}',
 '{"monthly_growth": 0.08, "type": "seasonal"}',
 24,
 '{"average": 84, "range": [75, 92]}',
 '{"low": 0.65, "medium": 0.25, "high": 0.10}',
 '{"fulfillment_optimization": 0.30, "vendor_consolidation": 0.25, "returns_reduction": 0.20}',
 0.72, 0.70, 0.10,
 'moderate', 40, 500),

-- Government Contractor
('government_federal_contractor',
 'Federal government contractor with GSA schedules',
 'Government', 'Federal',
 '{"size": "midmarket", "type": "federal_contractor", "employees": 200, "revenue": 40000000, "clearance_level": "secret"}',
 'Government', 'mature',
 '{"fixed_price": 0.35, "idiq": 0.25, "cost_plus": 0.20, "tmo": 0.15, "gsa": 0.05}',
 '{"subcontractors": 0.40, "technology": 0.30, "services": 0.20, "equipment": 0.10}',
 '{"labor": 0.60, "technology": 0.20, "overhead": 0.15, "materials": 0.05}',
 '{"q1": 0.90, "q2": 1.00, "q3": 1.00, "q4": 1.10}',
 '{"monthly_growth": 0.03, "type": "stepped"}',
 24,
 '{"average": 92, "range": [88, 96]}',
 '{"low": 0.75, "medium": 0.20, "high": 0.05}',
 '{"compliance_automation": 0.35, "bid_optimization": 0.25, "performance_improvement": 0.20}',
 0.18, 0.95, 0.01,
 'complex', 75, 600);

-- ================================================================
-- SUMMARY
-- ================================================================

-- Check data loaded
SELECT 
    'Benchmarks Loaded:' as metric,
    COUNT(*) as count 
FROM industry_benchmarks_master

UNION ALL

SELECT 
    'Industries Covered:' as metric,
    COUNT(DISTINCT industry) as count 
FROM industry_benchmarks_master

UNION ALL

SELECT 
    'Demo Scenarios Created:' as metric,
    COUNT(*) as count 
FROM demo_data_scenarios

UNION ALL

SELECT 
    'Templates Available:' as metric,
    COUNT(*) as count 
FROM industry_contract_templates;

\echo 'Industry benchmark seed data loading complete!'
\echo 'To generate demo data for an enterprise, use the demo-data-generator edge function'
\echo 'Example: POST /functions/v1/demo-data-generator with industry and company size parameters'