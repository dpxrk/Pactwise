-- ================================================================
-- GOVERNMENT & PUBLIC SECTOR INDUSTRY BENCHMARKS
-- Based on comprehensive 2024-2025 market research
-- ================================================================

-- Clear existing government sector data
DELETE FROM industry_benchmarks_master WHERE industry IN ('Government', 'Public Sector');

-- ================================================================
-- GSA SCHEDULE BENCHMARKS
-- ================================================================

-- GSA Program Metrics
INSERT INTO industry_benchmarks_master (
    industry, sub_industry, metric_category, metric_name, metric_value,
    p10_value, p25_value, p50_value, p75_value, p90_value, p95_value,
    mean_value, std_deviation, sample_size,
    unit, currency, time_period, geographic_region, company_size_segment,
    source, confidence_level, effective_date, expires_date
) VALUES
-- GSA Schedule Volume
('Government', 'Federal', 'market_size', 'gsa_schedule_total_sales', '{"description": "Total GSA Schedule sales"}',
    NULL, NULL, 51500000000, NULL, NULL, NULL,
    51500000000, NULL, 1,
    'USD', 'USD', 'annual', 'USA', 'All',
    'GSA FY2024 Report', 0.95, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'market_size', 'gsa_schedule_contractors', '{"description": "Number of GSA Schedule contractors"}',
    NULL, NULL, 12000, NULL, NULL, NULL,
    12000, NULL, 1,
    'count', NULL, 'current', 'USA', 'All',
    'GSA Statistics 2024', 0.95, '2025-01-01', '2025-12-31'),

-- Average Contract Values
('Government', 'Federal', 'contract', 'gsa_average_order_value', '{"description": "Average GSA Schedule order value"}',
    5000, 15000, 45000, 125000, 350000, 1000000,
    185000, 280000, 5000,
    'USD', 'USD', 'per_order', 'USA', 'All',
    'GSA Procurement Analysis', 0.85, '2025-01-01', '2025-12-31'),

-- Processing Times
('Government', 'Federal', 'operations', 'gsa_schedule_approval_days', '{"description": "Days to get GSA Schedule approval"}',
    60, 90, 120, 180, 240, 365,
    145, 75, 500,
    'days', NULL, 'one_time', 'USA', 'All',
    'GSA Schedule Process Study', 0.80, '2025-01-01', '2025-12-31'),

-- Sales Thresholds
('Government', 'Federal', 'performance', 'gsa_minimum_sales_requirement', '{"description": "Minimum annual sales to maintain GSA Schedule"}',
    25000, 25000, 25000, 25000, 25000, 25000,
    25000, 0, 1,
    'USD', 'USD', 'annual', 'USA', 'All',
    'GSA Requirements 2025', 0.99, '2025-01-01', '2025-12-31'),

-- ================================================================
-- IDIQ CONTRACT BENCHMARKS
-- ================================================================

-- IDIQ Contract Values
('Government', 'Federal', 'contract', 'idiq_contract_ceiling', '{"description": "IDIQ contract ceiling value"}',
    1000000, 5000000, 25000000, 100000000, 500000000, 1000000000,
    125000000, 225000000, 1000,
    'USD', 'USD', 'total', 'USA', 'All',
    'Federal IDIQ Analysis', 0.85, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'contract', 'idiq_contract_duration', '{"description": "IDIQ contract duration"}',
    12, 36, 60, 84, 120, 120,
    62, 28, 1000,
    'months', NULL, 'total', 'USA', 'All',
    'Federal IDIQ Study', 0.85, '2025-01-01', '2025-12-31'),

-- Task Order Values
('Government', 'Federal', 'contract', 'idiq_task_order_value', '{"description": "Average IDIQ task order value"}',
    50000, 150000, 500000, 1500000, 5000000, 15000000,
    1850000, 3200000, 2000,
    'USD', 'USD', 'per_order', 'USA', 'All',
    'Task Order Analysis', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- FEDERAL PROCUREMENT BENCHMARKS
-- ================================================================

-- Procurement Volumes
('Government', 'Federal', 'spend', 'federal_procurement_total', '{"description": "Total federal procurement spending"}',
    NULL, NULL, 700000000000, NULL, NULL, NULL,
    700000000000, NULL, 1,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Federal Procurement Report FY2024', 0.95, '2025-01-01', '2025-12-31'),

-- Small Business Set-Asides
('Government', 'Federal', 'contract', 'small_business_set_aside_percent', '{"description": "Small business set-aside percentage"}',
    20, 23, 27, 30, 33, 35,
    27.2, 4.5, 1,
    'percentage', NULL, 'annual', 'USA', 'All',
    'SBA Goal Achievement Report', 0.90, '2025-01-01', '2025-12-31'),

-- Contract Types
('Government', 'Federal', 'contract', 'firm_fixed_price_percent', '{"description": "Firm fixed price contracts"}',
    55, 60, 65, 70, 75, 80,
    66, 7, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Contract Type Analysis', 0.85, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'contract', 'cost_plus_percent', '{"description": "Cost plus contracts"}',
    10, 15, 20, 25, 30, 35,
    21, 7, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Contract Type Analysis', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- STATE AND LOCAL GOVERNMENT BENCHMARKS
-- ================================================================

-- State Procurement
('Government', 'State', 'spend', 'state_procurement_average', '{"description": "Average state procurement budget"}',
    500000000, 1000000000, 2500000000, 5000000000, 10000000000, 20000000000,
    3800000000, 4500000000, 50,
    'USD', 'USD', 'annual', 'USA', 'State',
    'State Procurement Survey', 0.80, '2025-01-01', '2025-12-31'),

-- Local Government
('Government', 'Local', 'spend', 'local_procurement_average', '{"description": "Average local government procurement"}',
    10000000, 50000000, 150000000, 500000000, 1000000000, 2000000000,
    320000000, 450000000, 500,
    'USD', 'USD', 'annual', 'USA', 'Local',
    'Local Government Survey', 0.75, '2025-01-01', '2025-12-31'),

-- Cooperative Purchasing
('Government', 'All', 'operations', 'cooperative_purchasing_usage', '{"description": "Agencies using cooperative purchasing"}',
    40, 55, 70, 82, 90, 95,
    68, 18, 500,
    'percentage', NULL, 'current', 'USA', 'All',
    'Cooperative Purchasing Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- COMPLIANCE AND REQUIREMENTS BENCHMARKS
-- ================================================================

-- Security Clearances
('Government', 'Federal', 'compliance', 'security_clearance_cost', '{"description": "Cost to obtain security clearance"}',
    2000, 3500, 5500, 8000, 12000, 18000,
    6200, 4200, 500,
    'USD', 'USD', 'per_person', 'USA', 'All',
    'Security Clearance Cost Study', 0.80, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'compliance', 'security_clearance_days', '{"description": "Days to obtain security clearance"}',
    60, 90, 150, 250, 400, 550,
    195, 125, 500,
    'days', NULL, 'per_person', 'USA', 'All',
    'Security Clearance Timeline Study', 0.80, '2025-01-01', '2025-12-31'),

-- Compliance Costs
('Government', 'Federal', 'compliance', 'far_compliance_cost', '{"description": "Annual FAR compliance cost"}',
    25000, 50000, 100000, 200000, 350000, 500000,
    125000, 125000, 500,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Federal Compliance Cost Study', 0.80, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'compliance', 'dcaa_audit_cost', '{"description": "DCAA audit cost"}',
    10000, 25000, 50000, 100000, 175000, 250000,
    65000, 55000, 200,
    'USD', 'USD', 'per_audit', 'USA', 'All',
    'DCAA Audit Cost Survey', 0.75, '2025-01-01', '2025-12-31'),

-- ================================================================
-- PRICING AND ECONOMIC ADJUSTMENTS
-- ================================================================

-- Pricing Requirements
('Government', 'Federal', 'pricing', 'price_reduction_clause_impact', '{"description": "Price reduction from commercial pricing"}',
    5, 10, 15, 20, 25, 30,
    16, 7, 500,
    'percentage', NULL, 'current', 'USA', 'All',
    'Government Pricing Study', 0.80, '2025-01-01', '2025-12-31'),

-- Economic Price Adjustments
('Government', 'Federal', 'pricing', 'epa_adjustment_rate', '{"description": "Economic price adjustment rate"}',
    0, 2, 3.5, 5, 7, 10,
    3.8, 2.5, 500,
    'percentage', NULL, 'annual', 'USA', 'All',
    'EPA Analysis Report', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- PERFORMANCE METRICS BENCHMARKS
-- ================================================================

-- Award Times
('Government', 'Federal', 'operations', 'contract_award_days', '{"description": "Days from RFP to award"}',
    45, 75, 120, 180, 270, 365,
    145, 85, 1000,
    'days', NULL, 'per_contract', 'USA', 'All',
    'Federal Procurement Timeline Study', 0.85, '2025-01-01', '2025-12-31'),

-- Bid Success Rates
('Government', 'Federal', 'performance', 'bid_win_rate', '{"description": "Federal contract win rate"}',
    5, 10, 18, 28, 38, 50,
    20, 12, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Federal Contracting Success Study', 0.80, '2025-01-01', '2025-12-31'),

-- Protest Rates
('Government', 'Federal', 'risk', 'contract_protest_rate', '{"description": "Contract protest rate"}',
    1, 2, 3.5, 5, 7, 10,
    3.8, 2.2, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'GAO Protest Statistics', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- TECHNOLOGY AND IT PROCUREMENT
-- ================================================================

-- IT Spending
('Government', 'Federal', 'spend', 'federal_it_spending', '{"description": "Federal IT spending"}',
    NULL, NULL, 100000000000, NULL, NULL, NULL,
    100000000000, NULL, 1,
    'USD', 'USD', 'annual', 'USA', 'Federal',
    'Federal IT Dashboard', 0.95, '2025-01-01', '2025-12-31'),

-- Cloud Adoption
('Government', 'Federal', 'operations', 'cloud_adoption_rate', '{"description": "Federal cloud adoption rate"}',
    20, 35, 50, 65, 75, 85,
    51, 20, 100,
    'percentage', NULL, '2025', 'USA', 'Federal',
    'Federal Cloud Strategy Report', 0.85, '2025-01-01', '2025-12-31'),

-- Cybersecurity Requirements
('Government', 'Federal', 'compliance', 'cmmc_certification_cost', '{"description": "CMMC certification cost"}',
    25000, 50000, 100000, 200000, 350000, 500000,
    135000, 125000, 200,
    'USD', 'USD', 'initial', 'USA', 'All',
    'CMMC Cost Study', 0.80, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'compliance', 'fedramp_authorization_cost', '{"description": "FedRAMP authorization cost"}',
    250000, 500000, 1000000, 1750000, 2500000, 3500000,
    1250000, 850000, 100,
    'USD', 'USD', 'initial', 'USA', 'All',
    'FedRAMP Cost Analysis', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- VENDOR PERFORMANCE BENCHMARKS
-- ================================================================

-- CPARS Ratings
('Government', 'Federal', 'vendor', 'cpars_satisfactory_rate', '{"description": "CPARS satisfactory rating rate"}',
    70, 80, 88, 94, 97, 99,
    86, 9, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'CPARS Performance Analysis', 0.85, '2025-01-01', '2025-12-31'),

-- Past Performance
('Government', 'Federal', 'vendor', 'past_performance_weight', '{"description": "Past performance evaluation weight"}',
    15, 20, 30, 40, 50, 60,
    32, 12, 500,
    'percentage', NULL, 'current', 'USA', 'All',
    'Source Selection Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- SOCIOECONOMIC GOALS
-- ================================================================

-- Small Business Goals
('Government', 'Federal', 'contract', 'small_business_goal', '{"description": "Small business contracting goal"}',
    23, 23, 23, 23, 23, 23,
    23, 0, 1,
    'percentage', NULL, 'annual', 'USA', 'Federal',
    'SBA Federal Goals', 0.99, '2025-01-01', '2025-12-31'),

-- Women-Owned Small Business
('Government', 'Federal', 'contract', 'wosb_goal', '{"description": "Women-owned small business goal"}',
    5, 5, 5, 5, 5, 5,
    5, 0, 1,
    'percentage', NULL, 'annual', 'USA', 'Federal',
    'SBA Federal Goals', 0.99, '2025-01-01', '2025-12-31'),

-- Service-Disabled Veteran-Owned
('Government', 'Federal', 'contract', 'sdvosb_goal', '{"description": "Service-disabled veteran-owned goal"}',
    3, 3, 3, 3, 3, 3,
    3, 0, 1,
    'percentage', NULL, 'annual', 'USA', 'Federal',
    'SBA Federal Goals', 0.99, '2025-01-01', '2025-12-31'),

-- HUBZone
('Government', 'Federal', 'contract', 'hubzone_goal', '{"description": "HUBZone small business goal"}',
    3, 3, 3, 3, 3, 3,
    3, 0, 1,
    'percentage', NULL, 'annual', 'USA', 'Federal',
    'SBA Federal Goals', 0.99, '2025-01-01', '2025-12-31'),

-- ================================================================
-- PAYMENT TERMS AND PROCESSING
-- ================================================================

-- Payment Processing
('Government', 'Federal', 'operations', 'prompt_payment_days', '{"description": "Prompt payment requirement"}',
    30, 30, 30, 30, 30, 30,
    30, 0, 1,
    'days', NULL, 'required', 'USA', 'Federal',
    'Prompt Payment Act', 0.99, '2025-01-01', '2025-12-31'),

('Government', 'Federal', 'operations', 'actual_payment_days', '{"description": "Actual payment processing days"}',
    20, 28, 35, 45, 60, 90,
    38, 18, 1000,
    'days', NULL, 'current', 'USA', 'Federal',
    'Federal Payment Study', 0.85, '2025-01-01', '2025-12-31'),

-- Interest Penalties
('Government', 'Federal', 'pricing', 'prompt_payment_interest_rate', '{"description": "Prompt payment interest rate"}',
    4.5, 4.5, 4.5, 4.5, 4.5, 4.5,
    4.5, 0, 1,
    'percentage', NULL, 'annual', 'USA', 'Federal',
    'Treasury Rates 2025', 0.95, '2025-01-01', '2025-06-30');