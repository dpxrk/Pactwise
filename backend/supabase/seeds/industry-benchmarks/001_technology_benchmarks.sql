-- ================================================================
-- TECHNOLOGY SECTOR INDUSTRY BENCHMARKS
-- Based on comprehensive 2024-2025 market research
-- ================================================================

-- Clear existing technology sector data
DELETE FROM industry_benchmarks_master WHERE industry = 'Technology';

-- ================================================================
-- SOFTWARE AS A SERVICE (SaaS) BENCHMARKS
-- ================================================================

-- Contract Values and Spending
INSERT INTO industry_benchmarks_master (
    industry, sub_industry, metric_category, metric_name, metric_value,
    p10_value, p25_value, p50_value, p75_value, p90_value, p95_value,
    mean_value, std_deviation, sample_size,
    unit, currency, time_period, geographic_region, company_size_segment,
    source, confidence_level, effective_date, expires_date
) VALUES
-- Annual Contract Values
('Technology', 'SaaS', 'contract', 'annual_contract_value', '{"description": "Typical annual SaaS contract value"}',
    10000, 25000, 87000, 150000, 250000, 500000,
    95000, 85000, 10000,
    'USD', 'USD', 'annual', 'Global', 'All',
    'Industry Research 2025', 0.95, '2025-01-01', '2025-12-31'),

-- Per Employee Spending
('Technology', 'SaaS', 'spend', 'saas_spend_per_employee', '{"description": "Average SaaS spending per employee"}',
    3000, 5000, 8700, 12000, 18000, 25000,
    9200, 4500, 5000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Zylo Research 2024', 0.90, '2025-01-01', '2025-12-31'),

-- Number of SaaS Applications
('Technology', 'SaaS', 'operations', 'saas_apps_count_startup', '{"description": "Number of SaaS apps for startups (1-2 years)"}',
    15, 20, 29, 40, 55, 70,
    32, 15, 2000,
    'count', NULL, 'current', 'Global', 'Startup',
    'Software Usage Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'SaaS', 'operations', 'saas_apps_count_growth', '{"description": "Number of SaaS apps for growth companies (3-6 years)"}',
    60, 80, 103, 130, 160, 200,
    108, 35, 2000,
    'count', NULL, 'current', 'Global', 'SMB',
    'Software Usage Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'SaaS', 'operations', 'saas_apps_count_enterprise', '{"description": "Number of SaaS apps for enterprises"}',
    350, 400, 473, 550, 650, 750,
    485, 125, 1000,
    'count', NULL, 'current', 'Global', 'Enterprise',
    'Software Usage Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- License Utilization
('Technology', 'SaaS', 'operations', 'unused_licenses_percent', '{"description": "Percentage of unused SaaS licenses"}',
    20, 35, 53, 65, 75, 85,
    52, 18, 3000,
    'percentage', NULL, 'current', 'Global', 'All',
    'License Optimization Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Wasted Spend
('Technology', 'SaaS', 'spend', 'annual_wasted_saas_spend', '{"description": "Annual wasted spending on unused licenses"}',
    500000, 5000000, 21000000, 35000000, 50000000, 75000000,
    23000000, 18000000, 500,
    'USD', 'USD', 'annual', 'Global', 'Enterprise',
    'SaaS Waste Report 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Contract Processing Times
('Technology', 'SaaS', 'operations', 'ai_contract_review_time', '{"description": "Time for AI to review contract"}',
    15, 20, 26, 35, 45, 60,
    28, 12, 1000,
    'seconds', NULL, 'per_contract', 'Global', 'All',
    'AI Contract Processing Study', 0.90, '2025-01-01', '2025-12-31'),

('Technology', 'SaaS', 'operations', 'human_contract_review_time', '{"description": "Time for human to review contract"}',
    60, 75, 92, 120, 150, 180,
    95, 35, 1000,
    'minutes', NULL, 'per_contract', 'Global', 'All',
    'Contract Processing Survey', 0.90, '2025-01-01', '2025-12-31'),

-- Implementation Times
('Technology', 'SaaS', 'operations', 'clm_implementation_days', '{"description": "Days to implement CLM system"}',
    30, 60, 120, 180, 240, 360,
    145, 85, 500,
    'days', NULL, 'one_time', 'Global', 'All',
    'CLM Implementation Study', 0.85, '2025-01-01', '2025-12-31'),

-- Renewal and Budget Allocation
('Technology', 'SaaS', 'spend', 'budget_on_renewals_percent', '{"description": "Percentage of SaaS budget spent on renewals"}',
    70, 78, 85, 90, 93, 95,
    83, 8, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'SaaS Budget Analysis 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Multi-year Contracts
('Technology', 'SaaS', 'contract', 'multi_year_contract_percent', '{"description": "Percentage of multi-year SaaS contracts"}',
    10, 15, 23, 35, 45, 55,
    26, 12, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Contract Terms Study 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- IT SERVICES AND CONSULTING BENCHMARKS
-- ================================================================

-- Hourly Rates - Onshore (USA)
('Technology', 'IT Services', 'pricing', 'onshore_hourly_rate_junior', '{"description": "Onshore junior developer hourly rate"}',
    40, 50, 75, 100, 125, 150,
    78, 30, 2000,
    'USD/hour', 'USD', 'current', 'USA', 'All',
    'IT Consulting Survey 2024', 0.90, '2025-01-01', '2025-12-31'),

('Technology', 'IT Services', 'pricing', 'onshore_hourly_rate_senior', '{"description": "Onshore senior developer hourly rate"}',
    100, 150, 200, 250, 300, 350,
    205, 65, 2000,
    'USD/hour', 'USD', 'current', 'USA', 'All',
    'IT Consulting Survey 2024', 0.90, '2025-01-01', '2025-12-31'),

('Technology', 'IT Services', 'pricing', 'onshore_hourly_rate_architect', '{"description": "Onshore architect/lead hourly rate"}',
    150, 200, 275, 350, 425, 500,
    285, 85, 1000,
    'USD/hour', 'USD', 'current', 'USA', 'All',
    'IT Consulting Survey 2024', 0.90, '2025-01-01', '2025-12-31'),

-- Hourly Rates - Offshore (Eastern Europe)
('Technology', 'IT Services', 'pricing', 'offshore_ee_junior_rate', '{"description": "Eastern Europe junior developer rate"}',
    15, 20, 30, 40, 50, 60,
    32, 12, 1500,
    'USD/hour', 'USD', 'current', 'Eastern Europe', 'All',
    'Offshore Development Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'IT Services', 'pricing', 'offshore_ee_senior_rate', '{"description": "Eastern Europe senior developer rate"}',
    35, 45, 55, 70, 85, 100,
    58, 18, 1500,
    'USD/hour', 'USD', 'current', 'Eastern Europe', 'All',
    'Offshore Development Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Hourly Rates - Offshore (Asia)
('Technology', 'IT Services', 'pricing', 'offshore_asia_junior_rate', '{"description": "Asia junior developer rate"}',
    10, 15, 20, 30, 40, 50,
    23, 10, 2000,
    'USD/hour', 'USD', 'current', 'Asia', 'All',
    'Offshore Development Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'IT Services', 'pricing', 'offshore_asia_senior_rate', '{"description": "Asia senior developer rate"}',
    25, 35, 45, 60, 75, 90,
    48, 16, 2000,
    'USD/hour', 'USD', 'current', 'Asia', 'All',
    'Offshore Development Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- MSA Contract Costs
('Technology', 'IT Services', 'contract', 'msa_drafting_cost', '{"description": "Cost to draft MSA"}',
    500, 650, 790, 1000, 1250, 1500,
    820, 250, 500,
    'USD', 'USD', 'one_time', 'USA', 'All',
    'Legal Services Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

('Technology', 'IT Services', 'contract', 'msa_review_cost', '{"description": "Cost to review MSA"}',
    300, 400, 510, 650, 800, 1000,
    530, 150, 500,
    'USD', 'USD', 'one_time', 'USA', 'All',
    'Legal Services Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Project Success Rates
('Technology', 'IT Services', 'performance', 'project_failure_rate', '{"description": "IT project failure or overbudget rate"}',
    45, 55, 66, 75, 82, 88,
    64, 12, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Standish CHAOS Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Hidden Costs
('Technology', 'IT Services', 'spend', 'offshore_hidden_cost_percent', '{"description": "Hidden costs as percentage of offshore rate"}',
    10, 15, 20, 30, 40, 50,
    23, 10, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Offshore Cost Analysis 2024', 0.75, '2025-01-01', '2025-12-31'),

-- ================================================================
-- CLOUD AND INFRASTRUCTURE BENCHMARKS
-- ================================================================

-- Cloud Spending
('Technology', 'Cloud', 'spend', 'monthly_cloud_spend_startup', '{"description": "Monthly cloud spending for startups"}',
    500, 1500, 5000, 10000, 20000, 35000,
    7500, 8000, 2000,
    'USD', 'USD', 'monthly', 'Global', 'Startup',
    'Cloud Spending Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'Cloud', 'spend', 'monthly_cloud_spend_enterprise', '{"description": "Monthly cloud spending for enterprises"}',
    50000, 150000, 500000, 1000000, 2000000, 5000000,
    750000, 850000, 500,
    'USD', 'USD', 'monthly', 'Global', 'Enterprise',
    'Cloud Spending Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Cloud Waste
('Technology', 'Cloud', 'operations', 'cloud_waste_percent', '{"description": "Percentage of cloud spending wasted"}',
    15, 22, 32, 40, 48, 55,
    31, 11, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Cloud Optimization Study 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- CYBERSECURITY BENCHMARKS
-- ================================================================

-- Security Spending
('Technology', 'Security', 'spend', 'security_budget_percent_revenue', '{"description": "Security budget as percentage of IT budget"}',
    5, 8, 12, 16, 20, 25,
    12.5, 5, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Cybersecurity Budget Survey 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Breach Costs
('Technology', 'Security', 'risk', 'data_breach_average_cost', '{"description": "Average cost of data breach"}',
    500000, 1500000, 4450000, 7500000, 12000000, 20000000,
    4880000, 3500000, 500,
    'USD', 'USD', 'per_incident', 'Global', 'All',
    'IBM Security Report 2024', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- AI AND MACHINE LEARNING BENCHMARKS
-- ================================================================

-- AI Adoption
('Technology', 'AI/ML', 'operations', 'ai_adoption_rate', '{"description": "Percentage of companies using AI"}',
    25, 35, 50, 65, 75, 85,
    52, 18, 2000,
    'percentage', NULL, '2025', 'Global', 'All',
    'AI Adoption Survey 2024', 0.85, '2025-01-01', '2025-12-31'),

-- AI Implementation Costs
('Technology', 'AI/ML', 'spend', 'ai_implementation_cost', '{"description": "Cost to implement AI solution"}',
    50000, 150000, 500000, 1000000, 2000000, 5000000,
    750000, 650000, 500,
    'USD', 'USD', 'one_time', 'Global', 'Enterprise',
    'AI Implementation Study 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- VENDOR MANAGEMENT BENCHMARKS
-- ================================================================

-- Vendor Performance
('Technology', 'All', 'vendor', 'on_time_delivery_rate', '{"description": "Vendor on-time delivery rate"}',
    75, 85, 92, 96, 98, 99,
    90, 8, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Vendor Performance Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'All', 'vendor', 'vendor_compliance_score', '{"description": "Vendor compliance score"}',
    70, 80, 88, 94, 97, 99,
    86, 10, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Vendor Compliance Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- COMPLIANCE AND REGULATORY BENCHMARKS
-- ================================================================

-- Compliance Costs
('Technology', 'All', 'compliance', 'sox_compliance_cost', '{"description": "Annual SOX compliance cost"}',
    100000, 250000, 500000, 1000000, 1500000, 2500000,
    650000, 450000, 500,
    'USD', 'USD', 'annual', 'USA', 'Enterprise',
    'Compliance Cost Study 2024', 0.80, '2025-01-01', '2025-12-31'),

('Technology', 'All', 'compliance', 'gdpr_compliance_cost', '{"description": "Annual GDPR compliance cost"}',
    50000, 100000, 250000, 500000, 750000, 1000000,
    320000, 250000, 500,
    'USD', 'USD', 'annual', 'Europe', 'Enterprise',
    'GDPR Compliance Report 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- CONTRACT LIFECYCLE BENCHMARKS
-- ================================================================

-- Contract Creation Costs
('Technology', 'All', 'contract', 'simple_contract_creation_cost', '{"description": "Cost to create simple contract"}',
    3000, 5000, 7000, 9000, 12000, 15000,
    7200, 2500, 1000,
    'USD', 'USD', 'per_contract', 'Global', 'All',
    'Contract Management Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'All', 'contract', 'complex_contract_creation_cost', '{"description": "Cost to create complex contract"}',
    20000, 30000, 50000, 70000, 90000, 120000,
    52000, 25000, 1000,
    'USD', 'USD', 'per_contract', 'Global', 'All',
    'Contract Management Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Contract Turnaround Times
('Technology', 'All', 'operations', 'contract_turnaround_days_best', '{"description": "Best-in-class contract turnaround"}',
    0.5, 1, 2, 3, 4, 5,
    2.2, 1.2, 500,
    'days', NULL, 'per_contract', 'Global', 'All',
    'Contract Efficiency Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Technology', 'All', 'operations', 'contract_turnaround_days_avg', '{"description": "Average contract turnaround"}',
    5, 8, 12, 18, 25, 35,
    14, 8, 1000,
    'days', NULL, 'per_contract', 'Global', 'All',
    'Contract Efficiency Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Value Erosion
('Technology', 'All', 'risk', 'contract_value_erosion_percent', '{"description": "Contract value erosion rate"}',
    3, 5, 8.6, 12, 15, 20,
    9.2, 4.5, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Contract Value Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- MARKET SIZE AND GROWTH BENCHMARKS
-- ================================================================

-- Market Sizes
('Technology', 'SaaS', 'market_size', 'global_saas_market_size', '{"description": "Global SaaS market size"}',
    NULL, NULL, 317550000000, NULL, NULL, NULL,
    317550000000, NULL, 1,
    'USD', 'USD', '2024', 'Global', 'All',
    'SaaS Market Report 2024', 0.95, '2025-01-01', '2025-12-31'),

('Technology', 'Cloud', 'market_size', 'global_cloud_market_size', '{"description": "Global cloud market size"}',
    NULL, NULL, 679000000000, NULL, NULL, NULL,
    679000000000, NULL, 1,
    'USD', 'USD', '2024', 'Global', 'All',
    'Cloud Market Report 2024', 0.95, '2025-01-01', '2025-12-31'),

-- Growth Rates
('Technology', 'SaaS', 'market_size', 'saas_growth_rate_cagr', '{"description": "SaaS market CAGR"}',
    8, 10, 13.7, 16, 18, 20,
    13.9, 3.2, 100,
    'percentage', NULL, '2024-2032', 'Global', 'All',
    'Market Growth Analysis 2024', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- SALES AND MARKETING BENCHMARKS
-- ================================================================

-- Customer Acquisition
('Technology', 'SaaS', 'performance', 'customer_acquisition_cost', '{"description": "CAC for new SaaS customers"}',
    500, 1500, 5000, 10000, 20000, 50000,
    8500, 12000, 1000,
    'USD', 'USD', 'per_customer', 'Global', 'All',
    'SaaS Metrics Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Sales and Marketing Spend
('Technology', 'SaaS', 'spend', 'sales_marketing_percent_revenue', '{"description": "Sales and marketing as % of revenue"}',
    25, 35, 50, 65, 75, 85,
    52, 18, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'SaaS Benchmarks 2024', 0.85, '2025-01-01', '2025-12-31'),

-- CAC Payback Period
('Technology', 'SaaS', 'performance', 'cac_payback_months', '{"description": "Months to recover CAC"}',
    8, 12, 18, 24, 36, 48,
    20, 10, 1000,
    'months', NULL, 'current', 'Global', 'All',
    'SaaS Metrics Report 2024', 0.85, '2025-01-01', '2025-12-31');