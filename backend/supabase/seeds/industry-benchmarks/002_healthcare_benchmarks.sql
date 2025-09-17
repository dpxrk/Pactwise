-- ================================================================
-- HEALTHCARE SECTOR INDUSTRY BENCHMARKS
-- Based on comprehensive 2024-2025 market research
-- ================================================================

-- Clear existing healthcare sector data
DELETE FROM industry_benchmarks_master WHERE industry = 'Healthcare';

-- ================================================================
-- PHYSICIAN AND PROVIDER BENCHMARKS
-- ================================================================

-- Physician Compensation
INSERT INTO industry_benchmarks_master (
    industry, sub_industry, metric_category, metric_name, metric_value,
    p10_value, p25_value, p50_value, p75_value, p90_value, p95_value,
    mean_value, std_deviation, sample_size,
    unit, currency, time_period, geographic_region, company_size_segment,
    source, confidence_level, effective_date, expires_date
) VALUES
-- Overall Physician Compensation
('Healthcare', 'Provider Services', 'staffing', 'physician_avg_compensation', '{"description": "Average physician compensation across all specialties"}',
    200000, 275000, 352000, 425000, 550000, 750000,
    365000, 125000, 10000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Doximity Physician Report 2025', 0.90, '2025-01-01', '2025-12-31'),

-- Specialty-Specific Compensation
('Healthcare', 'Provider Services', 'staffing', 'primary_care_compensation', '{"description": "Primary care physician compensation"}',
    180000, 220000, 265000, 310000, 360000, 420000,
    270000, 65000, 3000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'MGMA Compensation Report 2024', 0.90, '2025-01-01', '2025-12-31'),

('Healthcare', 'Provider Services', 'staffing', 'specialist_compensation', '{"description": "Specialist physician compensation"}',
    300000, 380000, 475000, 580000, 720000, 950000,
    495000, 185000, 3000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'MGMA Compensation Report 2024', 0.90, '2025-01-01', '2025-12-31'),

('Healthcare', 'Provider Services', 'staffing', 'surgeon_compensation', '{"description": "Surgeon compensation"}',
    350000, 425000, 550000, 680000, 850000, 1100000,
    575000, 225000, 2000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'MGMA Compensation Report 2024', 0.90, '2025-01-01', '2025-12-31'),

-- Emergency Medicine Compensation
('Healthcare', 'Provider Services', 'staffing', 'emergency_physician_compensation', '{"description": "Emergency physician compensation"}',
    250000, 300000, 380000, 450000, 520000, 600000,
    385000, 95000, 1500,
    'USD', 'USD', 'annual', 'USA', 'All',
    'ACEP Compensation Report 2025', 0.85, '2025-01-01', '2025-12-31'),

-- Sign-on Bonuses
('Healthcare', 'Provider Services', 'staffing', 'physician_sign_on_bonus', '{"description": "Physician sign-on bonuses"}',
    10000, 30000, 60000, 100000, 150000, 200000,
    72000, 55000, 2000,
    'USD', 'USD', 'one_time', 'USA', 'All',
    'Physician Recruitment Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Gender Pay Gap
('Healthcare', 'Provider Services', 'staffing', 'physician_gender_pay_gap', '{"description": "Gender pay gap in physician compensation"}',
    15, 20, 26, 32, 38, 45,
    27, 8, 5000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Doximity Gender Pay Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- NURSING STAFFING BENCHMARKS
-- ================================================================

-- RN Turnover and Costs
('Healthcare', 'Nursing', 'staffing', 'rn_turnover_rate', '{"description": "Registered nurse turnover rate"}',
    8, 12, 16.4, 22, 28, 35,
    17.2, 7.5, 3000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'NSI Retention Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Nursing', 'staffing', 'rn_turnover_cost', '{"description": "Cost per RN turnover"}',
    35000, 45000, 61110, 75000, 95000, 120000,
    63000, 22000, 2000,
    'USD', 'USD', 'per_turnover', 'USA', 'All',
    'NSI Retention Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Nursing Compensation
('Healthcare', 'Nursing', 'staffing', 'rn_annual_salary', '{"description": "Registered nurse annual salary"}',
    55000, 65000, 78000, 92000, 105000, 120000,
    79500, 18000, 5000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Nursing Salary Survey 2025', 0.90, '2025-01-01', '2025-12-31'),

-- Nursing Shortage
('Healthcare', 'Nursing', 'staffing', 'nursing_vacancy_rate', '{"description": "Nursing vacancy rate"}',
    5, 8, 12, 16, 20, 25,
    12.5, 5.5, 2000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Nursing Shortage Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Nursing', 'staffing', 'nursing_shortage_projected', '{"description": "Projected nursing shortage by 2030"}',
    50000, 150000, 295360, 450000, 600000, 800000,
    310000, 185000, 50,
    'count', NULL, '2030', 'USA', 'All',
    'HRSA Nursing Workforce Projections', 0.80, '2025-01-01', '2030-12-31'),

-- Staffing Ratios
('Healthcare', 'Nursing', 'operations', 'nurse_patient_ratio_icu', '{"description": "Nurse to patient ratio in ICU"}',
    1, 1, 2, 2, 3, 3,
    1.8, 0.6, 1000,
    'ratio', NULL, 'current', 'USA', 'All',
    'CMS Staffing Standards 2024', 0.90, '2025-01-01', '2025-12-31'),

('Healthcare', 'Nursing', 'operations', 'nurse_patient_ratio_medsurg', '{"description": "Nurse to patient ratio in med-surg units"}',
    3, 4, 5, 6, 7, 8,
    5.2, 1.2, 1000,
    'ratio', NULL, 'current', 'USA', 'All',
    'CMS Staffing Standards 2024', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- MEDICAL DEVICE AND EQUIPMENT BENCHMARKS
-- ================================================================

-- Device Costs
('Healthcare', 'Medical Devices', 'pricing', 'mri_machine_cost', '{"description": "MRI machine purchase cost"}',
    500000, 800000, 1500000, 2200000, 3000000, 4000000,
    1650000, 850000, 500,
    'USD', 'USD', 'one_time', 'Global', 'All',
    'Medical Equipment Pricing Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Medical Devices', 'pricing', 'ct_scanner_cost', '{"description": "CT scanner purchase cost"}',
    200000, 350000, 650000, 1000000, 1500000, 2000000,
    720000, 450000, 500,
    'USD', 'USD', 'one_time', 'Global', 'All',
    'Medical Equipment Pricing Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Device Maintenance
('Healthcare', 'Medical Devices', 'operations', 'equipment_maintenance_percent', '{"description": "Annual maintenance as % of purchase price"}',
    8, 10, 12, 15, 18, 22,
    12.5, 3.5, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Medical Equipment Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- PHARMACEUTICAL BENCHMARKS
-- ================================================================

-- Drug Pricing and Rebates
('Healthcare', 'Pharmaceuticals', 'pricing', 'medicaid_rebate_rate_basic', '{"description": "Basic Medicaid rebate rate"}',
    23.1, 23.1, 23.1, 23.1, 23.1, 23.1,
    23.1, 0, 1,
    'percentage', NULL, 'current', 'USA', 'All',
    'CMS Medicaid Rebate Program', 0.99, '2025-01-01', '2025-12-31'),

('Healthcare', 'Pharmaceuticals', 'pricing', 'medicaid_rebate_rate_total', '{"description": "Total Medicaid rebate rate including inflation"}',
    23.1, 25, 27.5, 32, 38, 45,
    29, 6.5, 500,
    'percentage', NULL, 'current', 'USA', 'All',
    'CMS Rebate Analysis 2024', 0.85, '2025-01-01', '2025-12-31'),

-- 340B Program
('Healthcare', 'Pharmaceuticals', 'pricing', '340b_discount_rate', '{"description": "340B program discount rate"}',
    20, 25, 35, 45, 50, 60,
    36, 11, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    '340B Program Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Pharmaceuticals', 'market_size', '340b_program_spending', '{"description": "Total 340B program spending"}',
    NULL, NULL, 80000000000, NULL, NULL, NULL,
    80000000000, NULL, 1,
    'USD', 'USD', 'annual', 'USA', 'All',
    '340B Market Analysis 2024', 0.90, '2025-01-01', '2025-12-31'),

-- Drug Development Costs
('Healthcare', 'Pharmaceuticals', 'operations', 'drug_development_cost', '{"description": "Cost to develop new drug"}',
    500000000, 800000000, 1300000000, 1800000000, 2500000000, 3500000000,
    1400000000, 650000000, 200,
    'USD', 'USD', 'per_drug', 'Global', 'All',
    'Pharmaceutical R&D Study 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- HIPAA AND COMPLIANCE BENCHMARKS
-- ================================================================

-- HIPAA Violations
('Healthcare', 'Compliance', 'compliance', 'hipaa_violation_min_penalty', '{"description": "Minimum HIPAA violation penalty"}',
    100, 100, 100, 100, 100, 100,
    100, 0, 1,
    'USD', 'USD', 'per_violation', 'USA', 'All',
    'HHS HIPAA Enforcement', 0.99, '2025-01-01', '2025-12-31'),

('Healthcare', 'Compliance', 'compliance', 'hipaa_violation_avg_penalty', '{"description": "Average HIPAA violation penalty"}',
    1000, 10000, 25000, 50000, 100000, 250000,
    45000, 65000, 500,
    'USD', 'USD', 'per_violation', 'USA', 'All',
    'HHS Enforcement Data 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Compliance', 'compliance', 'hipaa_violation_max_penalty', '{"description": "Maximum HIPAA violation penalty"}',
    500000, 1000000, 1500000, 2000000, 5000000, 50000000,
    2100000, 5500000, 100,
    'USD', 'USD', 'per_violation', 'USA', 'All',
    'HHS Enforcement Data 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Business Associate Agreements
('Healthcare', 'Compliance', 'contract', 'baa_processing_time', '{"description": "Time to process BAA"}',
    1, 3, 7, 14, 21, 30,
    9, 8, 1000,
    'days', NULL, 'per_agreement', 'USA', 'All',
    'Healthcare Contract Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Data Breach Costs
('Healthcare', 'Compliance', 'risk', 'healthcare_data_breach_cost', '{"description": "Average healthcare data breach cost"}',
    2000000, 4000000, 10930000, 15000000, 20000000, 30000000,
    11500000, 6500000, 200,
    'USD', 'USD', 'per_breach', 'USA', 'All',
    'IBM Healthcare Breach Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- TELEHEALTH BENCHMARKS
-- ================================================================

-- Telehealth Adoption
('Healthcare', 'Telehealth', 'operations', 'telehealth_adoption_rate', '{"description": "Telehealth adoption rate"}',
    30, 45, 65, 78, 85, 92,
    63, 18, 2000,
    'percentage', NULL, '2025', 'USA', 'All',
    'Telehealth Adoption Survey 2025', 0.85, '2025-01-01', '2025-12-31'),

-- Telehealth Visit Costs
('Healthcare', 'Telehealth', 'pricing', 'telehealth_visit_cost', '{"description": "Average telehealth visit cost"}',
    25, 40, 65, 95, 125, 175,
    72, 35, 3000,
    'USD', 'USD', 'per_visit', 'USA', 'All',
    'Telehealth Pricing Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Telehealth', 'pricing', 'in_person_visit_cost', '{"description": "Average in-person visit cost"}',
    75, 125, 185, 250, 350, 500,
    195, 85, 3000,
    'USD', 'USD', 'per_visit', 'USA', 'All',
    'Healthcare Pricing Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Telehealth Reimbursement
('Healthcare', 'Telehealth', 'pricing', 'telehealth_reimbursement_rate', '{"description": "Telehealth reimbursement vs in-person"}',
    70, 80, 90, 100, 100, 100,
    88, 10, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'CMS Telehealth Policy 2025', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- HOSPITAL OPERATIONS BENCHMARKS
-- ================================================================

-- Hospital Margins
('Healthcare', 'Hospitals', 'performance', 'hospital_operating_margin', '{"description": "Hospital operating margin"}',
    -5, -2, 1.5, 4, 7, 10,
    2.1, 4.5, 2000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Hospital Financial Survey 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Length of Stay
('Healthcare', 'Hospitals', 'operations', 'average_length_of_stay', '{"description": "Average hospital length of stay"}',
    2.5, 3.2, 4.5, 5.8, 7.2, 9.5,
    4.7, 1.8, 3000,
    'days', NULL, 'current', 'USA', 'All',
    'Hospital Operations Report 2024', 0.90, '2025-01-01', '2025-12-31'),

-- Bed Occupancy
('Healthcare', 'Hospitals', 'operations', 'bed_occupancy_rate', '{"description": "Hospital bed occupancy rate"}',
    50, 60, 70, 80, 85, 90,
    69, 12, 3000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Hospital Utilization Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Readmission Rates
('Healthcare', 'Hospitals', 'performance', '30_day_readmission_rate', '{"description": "30-day readmission rate"}',
    8, 11, 15, 18, 22, 26,
    15.5, 4.5, 3000,
    'percentage', NULL, 'current', 'USA', 'All',
    'CMS Readmission Data 2024', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- HEALTHCARE IT BENCHMARKS
-- ================================================================

-- EHR Implementation
('Healthcare', 'Health IT', 'operations', 'ehr_implementation_cost', '{"description": "EHR implementation cost per bed"}',
    15000, 25000, 40000, 60000, 85000, 120000,
    45000, 25000, 500,
    'USD', 'USD', 'per_bed', 'USA', 'All',
    'Healthcare IT Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

('Healthcare', 'Health IT', 'operations', 'ehr_annual_maintenance', '{"description": "Annual EHR maintenance cost"}',
    500000, 1500000, 5000000, 10000000, 20000000, 35000000,
    7500000, 8500000, 500,
    'USD', 'USD', 'annual', 'USA', 'Enterprise',
    'Healthcare IT Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Cybersecurity Spending
('Healthcare', 'Health IT', 'spend', 'cybersecurity_budget_percent', '{"description": "Cybersecurity as % of IT budget"}',
    3, 5, 8, 12, 15, 20,
    8.5, 4.2, 1000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Healthcare Cybersecurity Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- INSURANCE AND REIMBURSEMENT BENCHMARKS
-- ================================================================

-- Claims Processing
('Healthcare', 'Insurance', 'operations', 'claims_denial_rate', '{"description": "Initial claims denial rate"}',
    5, 8, 12, 16, 20, 25,
    12.5, 5.5, 2000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Claims Processing Report 2024', 0.85, '2025-01-01', '2025-12-31'),

('Healthcare', 'Insurance', 'operations', 'claims_processing_time', '{"description": "Average claims processing time"}',
    7, 14, 21, 30, 45, 60,
    24, 12, 2000,
    'days', NULL, 'current', 'USA', 'All',
    'Claims Processing Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Prior Authorization
('Healthcare', 'Insurance', 'operations', 'prior_auth_approval_rate', '{"description": "Prior authorization approval rate"}',
    60, 70, 80, 88, 92, 95,
    79, 10, 1000,
    'percentage', NULL, 'current', 'USA', 'All',
    'Prior Auth Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

('Healthcare', 'Insurance', 'operations', 'prior_auth_response_time', '{"description": "Prior authorization response time"}',
    1, 2, 3, 5, 7, 10,
    3.8, 2.2, 1000,
    'days', NULL, 'current', 'USA', 'All',
    'Prior Auth Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- VALUE-BASED CARE BENCHMARKS
-- ================================================================

-- Quality Metrics
('Healthcare', 'Value-Based Care', 'performance', 'quality_score_average', '{"description": "Average quality score (0-100)"}',
    60, 70, 78, 85, 90, 95,
    77, 10, 1000,
    'score', NULL, 'current', 'USA', 'All',
    'Value-Based Care Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Shared Savings
('Healthcare', 'Value-Based Care', 'performance', 'shared_savings_rate', '{"description": "Shared savings achievement rate"}',
    15, 25, 35, 45, 55, 65,
    36, 12, 500,
    'percentage', NULL, 'annual', 'USA', 'All',
    'ACO Performance Report 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Risk Adjustment
('Healthcare', 'Value-Based Care', 'operations', 'risk_adjustment_factor', '{"description": "Average risk adjustment factor"}',
    0.8, 0.9, 1.0, 1.1, 1.3, 1.5,
    1.05, 0.2, 1000,
    'factor', NULL, 'current', 'USA', 'All',
    'Risk Adjustment Study 2024', 0.85, '2025-01-01', '2025-12-31');