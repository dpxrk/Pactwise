-- ================================================================
-- FINANCIAL SERVICES SECTOR INDUSTRY BENCHMARKS
-- Based on comprehensive 2024-2025 market research
-- ================================================================

-- Clear existing financial services sector data
DELETE FROM industry_benchmarks_master WHERE industry = 'Financial Services';

-- ================================================================
-- BANKING AS A SERVICE (BaaS) BENCHMARKS
-- ================================================================

-- Market Size and Growth
INSERT INTO industry_benchmarks_master (
    industry, sub_industry, metric_category, metric_name, metric_value,
    p10_value, p25_value, p50_value, p75_value, p90_value, p95_value,
    mean_value, std_deviation, sample_size,
    unit, currency, time_period, geographic_region, company_size_segment,
    source, confidence_level, effective_date, expires_date
) VALUES
-- BaaS Market Size
('Financial Services', 'BaaS', 'market_size', 'baas_market_value_2025', '{"description": "Banking as a Service market value 2025"}',
    NULL, NULL, 24580000000, NULL, NULL, NULL,
    24580000000, NULL, 1,
    'USD', 'USD', '2025', 'Global', 'All',
    'BaaS Market Report 2025', 0.90, '2025-01-01', '2025-12-31'),

('Financial Services', 'BaaS', 'market_size', 'baas_market_value_2030', '{"description": "Projected BaaS market value 2030"}',
    NULL, NULL, 60350000000, NULL, NULL, NULL,
    60350000000, NULL, 1,
    'USD', 'USD', '2030', 'Global', 'All',
    'BaaS Market Projection', 0.85, '2025-01-01', '2030-12-31'),

('Financial Services', 'BaaS', 'market_size', 'baas_growth_rate_cagr', '{"description": "BaaS market CAGR 2025-2030"}',
    15, 17, 19.68, 22, 24, 26,
    19.8, 3.2, 50,
    'percentage', NULL, '2025-2030', 'Global', 'All',
    'BaaS Growth Analysis', 0.85, '2025-01-01', '2030-12-31'),

-- BaaS Revenue and Operations
('Financial Services', 'BaaS', 'performance', 'baas_revenue_contribution', '{"description": "BaaS revenue as % of sponsor bank revenue"}',
    20, 35, 50, 65, 75, 85,
    52, 18, 100,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Sponsor Bank Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Compliance Challenges
('Financial Services', 'BaaS', 'compliance', 'baas_compliance_challenge_rate', '{"description": "Banks finding BaaS compliance challenging"}',
    60, 70, 80, 85, 90, 95,
    78, 10, 100,
    'percentage', NULL, 'current', 'USA', 'Banks',
    'Banking Compliance Survey 2024', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'BaaS', 'compliance', 'baas_exit_consideration_rate', '{"description": "Banks considering exiting BaaS due to compliance"}',
    15, 20, 29, 35, 42, 50,
    30, 10, 100,
    'percentage', NULL, '2025', 'USA', 'Banks',
    'BaaS Future Survey 2024', 0.75, '2025-01-01', '2025-12-31'),

-- Implementation Timeline
('Financial Services', 'BaaS', 'operations', 'baas_implementation_months', '{"description": "Months to implement BaaS platform"}',
    3, 6, 12, 18, 24, 30,
    13, 7, 200,
    'months', NULL, 'one_time', 'Global', 'All',
    'BaaS Implementation Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- DERIVATIVES AND TRADING BENCHMARKS
-- ================================================================

-- ISDA Agreements
('Financial Services', 'Derivatives', 'contract', 'isda_negotiation_days', '{"description": "Days to negotiate ISDA Master Agreement"}',
    30, 45, 60, 90, 120, 180,
    72, 35, 500,
    'days', NULL, 'per_agreement', 'Global', 'All',
    'ISDA Survey 2024', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'Derivatives', 'pricing', 'isda_legal_cost', '{"description": "Legal cost for ISDA agreement"}',
    25000, 50000, 100000, 175000, 250000, 400000,
    115000, 85000, 300,
    'USD', 'USD', 'per_agreement', 'Global', 'All',
    'Legal Cost Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Derivatives Processing
('Financial Services', 'Derivatives', 'operations', 'derivative_settlement_days', '{"description": "Settlement time for derivatives"}',
    0, 1, 2, 2, 3, 5,
    2.1, 1.2, 1000,
    'days', NULL, 'per_trade', 'Global', 'All',
    'Derivatives Operations Study', 0.90, '2025-01-01', '2025-12-31'),

-- Collateral Management
('Financial Services', 'Derivatives', 'operations', 'initial_margin_percent', '{"description": "Initial margin requirement"}',
    5, 10, 15, 20, 30, 40,
    17, 8, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Margin Requirements Study', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'Derivatives', 'operations', 'variation_margin_frequency', '{"description": "Variation margin call frequency"}',
    1, 1, 1, 1, 2, 5,
    1.3, 0.8, 500,
    'calls_per_day', NULL, 'current', 'Global', 'All',
    'Collateral Management Report', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- FINTECH PARTNERSHIPS BENCHMARKS
-- ================================================================

-- Partnership Economics
('Financial Services', 'Fintech', 'pricing', 'fintech_revenue_share', '{"description": "Revenue share with fintech partners"}',
    10, 20, 30, 40, 50, 60,
    32, 12, 200,
    'percentage', NULL, 'current', 'Global', 'All',
    'Fintech Partnership Study', 0.80, '2025-01-01', '2025-12-31'),

('Financial Services', 'Fintech', 'pricing', 'interchange_revenue_split', '{"description": "Interchange fee revenue split"}',
    30, 40, 50, 60, 70, 80,
    52, 15, 200,
    'percentage', NULL, 'current', 'USA', 'All',
    'Card Program Economics', 0.85, '2025-01-01', '2025-12-31'),

-- Regulatory Actions
('Financial Services', 'Fintech', 'compliance', 'regulatory_action_rate', '{"description": "Regulatory actions against fintech banks Q1 2024"}',
    10, 20, 35, 45, 55, 65,
    36, 15, 100,
    'percentage', NULL, 'Q1_2024', 'USA', 'Banks',
    'Klaros Group Tracking', 0.85, '2025-01-01', '2025-12-31'),

-- Compliance Investment
('Financial Services', 'Fintech', 'spend', 'compliance_tech_investment_rate', '{"description": "Banks planning compliance tech investment"}',
    80, 85, 94, 97, 99, 100,
    92, 6, 100,
    'percentage', NULL, '2025', 'USA', 'Banks',
    'Banking Technology Survey', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- LENDING AND CREDIT BENCHMARKS
-- ================================================================

-- Loan Origination
('Financial Services', 'Lending', 'operations', 'loan_origination_cost', '{"description": "Cost to originate a loan"}',
    2000, 4000, 7000, 10000, 15000, 22000,
    7800, 5200, 500,
    'USD', 'USD', 'per_loan', 'USA', 'All',
    'Mortgage Bankers Association', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'Lending', 'operations', 'loan_processing_days', '{"description": "Days to process loan application"}',
    15, 25, 35, 45, 60, 75,
    38, 15, 1000,
    'days', NULL, 'per_loan', 'USA', 'All',
    'Lending Operations Study', 0.85, '2025-01-01', '2025-12-31'),

-- Interest Rates and Margins
('Financial Services', 'Lending', 'pricing', 'net_interest_margin', '{"description": "Bank net interest margin"}',
    2.5, 2.8, 3.2, 3.6, 4.0, 4.5,
    3.3, 0.6, 500,
    'percentage', NULL, 'annual', 'USA', 'Banks',
    'FDIC Banking Profile', 0.90, '2025-01-01', '2025-12-31'),

-- Default Rates
('Financial Services', 'Lending', 'risk', 'consumer_loan_default_rate', '{"description": "Consumer loan default rate"}',
    1, 2, 3.5, 5, 7, 10,
    3.8, 2.2, 1000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Federal Reserve Data', 0.90, '2025-01-01', '2025-12-31'),

('Financial Services', 'Lending', 'risk', 'commercial_loan_default_rate', '{"description": "Commercial loan default rate"}',
    0.5, 1, 2, 3.5, 5, 8,
    2.3, 1.8, 1000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Federal Reserve Data', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- PAYMENT PROCESSING BENCHMARKS
-- ================================================================

-- Transaction Costs
('Financial Services', 'Payments', 'pricing', 'credit_card_processing_fee', '{"description": "Credit card processing fee"}',
    1.5, 1.8, 2.2, 2.6, 2.9, 3.5,
    2.3, 0.5, 2000,
    'percentage', NULL, 'per_transaction', 'USA', 'All',
    'Payment Processing Survey', 0.90, '2025-01-01', '2025-12-31'),

('Financial Services', 'Payments', 'pricing', 'ach_transaction_cost', '{"description": "ACH transaction cost"}',
    0.15, 0.25, 0.35, 0.50, 0.75, 1.00,
    0.40, 0.20, 1000,
    'USD', 'USD', 'per_transaction', 'USA', 'All',
    'ACH Network Statistics', 0.90, '2025-01-01', '2025-12-31'),

('Financial Services', 'Payments', 'pricing', 'wire_transfer_cost', '{"description": "Wire transfer cost"}',
    15, 20, 25, 30, 40, 50,
    27, 8, 500,
    'USD', 'USD', 'per_transfer', 'USA', 'All',
    'Banking Fee Survey', 0.85, '2025-01-01', '2025-12-31'),

-- Transaction Volumes
('Financial Services', 'Payments', 'operations', 'daily_transaction_volume', '{"description": "Daily transaction volume per merchant"}',
    50, 200, 1000, 5000, 20000, 100000,
    8500, 25000, 2000,
    'count', NULL, 'daily', 'Global', 'All',
    'Payment Volume Study', 0.80, '2025-01-01', '2025-12-31'),

-- Fraud Rates
('Financial Services', 'Payments', 'risk', 'payment_fraud_rate', '{"description": "Payment fraud rate"}',
    0.05, 0.10, 0.15, 0.25, 0.40, 0.60,
    0.18, 0.12, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Fraud Prevention Report', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- WEALTH MANAGEMENT BENCHMARKS
-- ================================================================

-- Assets Under Management
('Financial Services', 'Wealth Management', 'operations', 'aum_per_advisor', '{"description": "Assets under management per advisor"}',
    25000000, 50000000, 100000000, 200000000, 400000000, 750000000,
    145000000, 125000000, 1000,
    'USD', 'USD', 'current', 'USA', 'All',
    'Wealth Management Survey', 0.85, '2025-01-01', '2025-12-31'),

-- Management Fees
('Financial Services', 'Wealth Management', 'pricing', 'wealth_management_fee', '{"description": "Annual management fee"}',
    0.50, 0.75, 1.00, 1.25, 1.50, 2.00,
    1.05, 0.35, 1000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Advisory Fee Study', 0.85, '2025-01-01', '2025-12-31'),

-- Client Acquisition
('Financial Services', 'Wealth Management', 'performance', 'client_acquisition_cost', '{"description": "Cost to acquire wealth management client"}',
    1000, 2500, 5000, 8000, 12000, 20000,
    5800, 4200, 500,
    'USD', 'USD', 'per_client', 'USA', 'All',
    'Wealth Management Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- INSURANCE BENCHMARKS
-- ================================================================

-- Loss Ratios
('Financial Services', 'Insurance', 'performance', 'loss_ratio', '{"description": "Insurance loss ratio"}',
    45, 55, 65, 75, 85, 95,
    66, 12, 500,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Insurance Industry Report', 0.85, '2025-01-01', '2025-12-31'),

-- Combined Ratio
('Financial Services', 'Insurance', 'performance', 'combined_ratio', '{"description": "Combined ratio (losses + expenses)"}',
    85, 92, 98, 105, 112, 120,
    99, 10, 500,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Insurance Industry Report', 0.85, '2025-01-01', '2025-12-31'),

-- Claims Processing
('Financial Services', 'Insurance', 'operations', 'claim_processing_days', '{"description": "Days to process insurance claim"}',
    5, 10, 15, 25, 35, 50,
    18, 10, 1000,
    'days', NULL, 'per_claim', 'USA', 'All',
    'Claims Processing Study', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'Insurance', 'operations', 'claim_settlement_cost', '{"description": "Cost to settle a claim"}',
    100, 250, 500, 850, 1200, 2000,
    580, 380, 1000,
    'USD', 'USD', 'per_claim', 'USA', 'All',
    'Claims Cost Analysis', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- REGULATORY COMPLIANCE BENCHMARKS
-- ================================================================

-- Compliance Costs
('Financial Services', 'All', 'compliance', 'total_compliance_cost_percent', '{"description": "Compliance cost as % of revenue"}',
    3, 5, 8, 12, 15, 20,
    8.5, 4.5, 500,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Banking Compliance Study', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'All', 'compliance', 'kyc_cost_per_customer', '{"description": "KYC cost per customer"}',
    15, 30, 50, 75, 100, 150,
    55, 30, 1000,
    'USD', 'USD', 'per_customer', 'Global', 'All',
    'KYC Cost Study', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'All', 'compliance', 'aml_monitoring_cost', '{"description": "Annual AML monitoring cost"}',
    100000, 500000, 2000000, 5000000, 10000000, 20000000,
    3500000, 4500000, 500,
    'USD', 'USD', 'annual', 'USA', 'Enterprise',
    'AML Compliance Report', 0.80, '2025-01-01', '2025-12-31'),

-- Regulatory Fines
('Financial Services', 'All', 'risk', 'regulatory_fine_average', '{"description": "Average regulatory fine"}',
    50000, 250000, 1000000, 5000000, 15000000, 50000000,
    4200000, 8500000, 200,
    'USD', 'USD', 'per_violation', 'Global', 'All',
    'Regulatory Actions Database', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- DIGITAL TRANSFORMATION BENCHMARKS
-- ================================================================

-- Digital Banking
('Financial Services', 'Digital Banking', 'operations', 'digital_adoption_rate', '{"description": "Digital banking adoption rate"}',
    40, 55, 70, 82, 90, 95,
    68, 16, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Digital Banking Survey', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'Digital Banking', 'operations', 'mobile_transaction_percent', '{"description": "Transactions via mobile"}',
    25, 40, 55, 70, 80, 88,
    54, 18, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Mobile Banking Study', 0.85, '2025-01-01', '2025-12-31'),

-- Branch Operations
('Financial Services', 'Banking', 'operations', 'branch_transaction_cost', '{"description": "Cost per branch transaction"}',
    2.50, 3.50, 4.50, 5.50, 7.00, 9.00,
    4.75, 1.50, 500,
    'USD', 'USD', 'per_transaction', 'USA', 'All',
    'Branch Operations Study', 0.85, '2025-01-01', '2025-12-31'),

('Financial Services', 'Digital Banking', 'operations', 'digital_transaction_cost', '{"description": "Cost per digital transaction"}',
    0.05, 0.10, 0.15, 0.25, 0.35, 0.50,
    0.18, 0.10, 500,
    'USD', 'USD', 'per_transaction', 'USA', 'All',
    'Digital Banking Economics', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- CRYPTOCURRENCY AND DIGITAL ASSETS
-- ================================================================

-- Crypto Operations
('Financial Services', 'Crypto', 'operations', 'crypto_trading_fee', '{"description": "Cryptocurrency trading fee"}',
    0.10, 0.25, 0.50, 1.00, 1.50, 2.00,
    0.65, 0.45, 500,
    'percentage', NULL, 'per_trade', 'Global', 'All',
    'Crypto Exchange Survey', 0.80, '2025-01-01', '2025-12-31'),

('Financial Services', 'Crypto', 'compliance', 'crypto_compliance_cost', '{"description": "Crypto compliance cost as % of revenue"}',
    5, 10, 15, 22, 30, 40,
    17, 8, 200,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Crypto Compliance Study', 0.75, '2025-01-01', '2025-12-31'),

-- Custody Fees
('Financial Services', 'Crypto', 'pricing', 'crypto_custody_fee', '{"description": "Annual crypto custody fee"}',
    0.25, 0.50, 1.00, 1.50, 2.00, 3.00,
    1.15, 0.65, 300,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Digital Asset Custody Report', 0.80, '2025-01-01', '2025-12-31');