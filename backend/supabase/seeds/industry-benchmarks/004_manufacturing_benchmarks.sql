-- ================================================================
-- MANUFACTURING SECTOR INDUSTRY BENCHMARKS
-- Based on comprehensive 2024-2025 market research
-- ================================================================

-- Clear existing manufacturing sector data
DELETE FROM industry_benchmarks_master WHERE industry = 'Manufacturing';

-- ================================================================
-- SUPPLY CHAIN MANAGEMENT BENCHMARKS
-- ================================================================

-- Supply Chain Performance
INSERT INTO industry_benchmarks_master (
    industry, sub_industry, metric_category, metric_name, metric_value,
    p10_value, p25_value, p50_value, p75_value, p90_value, p95_value,
    mean_value, std_deviation, sample_size,
    unit, currency, time_period, geographic_region, company_size_segment,
    source, confidence_level, effective_date, expires_date
) VALUES
-- Supply Chain Costs
('Manufacturing', 'All', 'spend', 'supply_chain_cost_percent_revenue', '{"description": "Supply chain cost as % of revenue"}',
    5, 8, 12, 16, 20, 25,
    12.8, 5.2, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Supply Chain Management Review', 0.85, '2025-01-01', '2025-12-31'),

-- Supplier Performance
('Manufacturing', 'All', 'vendor', 'on_time_delivery_rate', '{"description": "Supplier on-time delivery rate"}',
    75, 82, 88, 93, 96, 98,
    87, 7, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Supplier Performance Study 2024', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'vendor', 'supplier_defect_rate', '{"description": "Supplier quality defect rate"}',
    0.1, 0.5, 1.0, 2.0, 3.5, 5.0,
    1.3, 1.2, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Quality Management Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Lead Times
('Manufacturing', 'All', 'operations', 'supplier_lead_time_days', '{"description": "Average supplier lead time"}',
    7, 14, 30, 45, 60, 90,
    35, 20, 1500,
    'days', NULL, 'current', 'Global', 'All',
    'Supply Chain Survey 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Inventory Metrics
('Manufacturing', 'All', 'operations', 'inventory_turnover_ratio', '{"description": "Annual inventory turnover ratio"}',
    4, 6, 8, 12, 16, 20,
    9.2, 4.5, 1000,
    'ratio', NULL, 'annual', 'Global', 'All',
    'Manufacturing Metrics Report', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'operations', 'days_inventory_outstanding', '{"description": "Days inventory outstanding"}',
    20, 30, 45, 60, 80, 100,
    48, 22, 1000,
    'days', NULL, 'current', 'Global', 'All',
    'Manufacturing Metrics Report', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- AUTOMOTIVE INDUSTRY BENCHMARKS
-- ================================================================

-- Automotive Challenges
('Manufacturing', 'Automotive', 'operations', 'labor_cost_concern_rate', '{"description": "Manufacturers citing labor costs as biggest challenge"}',
    25, 30, 36, 42, 48, 55,
    37, 8, 500,
    'percentage', NULL, '2024', 'Global', 'All',
    'AMS & ABB Automotive Survey 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Parts Shortage Impact
('Manufacturing', 'Automotive', 'supply_chain', 'parts_shortage_impact', '{"description": "Production impact from parts shortage"}',
    15, 25, 36, 45, 55, 65,
    37, 14, 300,
    'percentage', NULL, '2024', 'Global', 'All',
    'Automotive Supply Chain Report', 0.80, '2025-01-01', '2025-12-31'),

-- Electric Vehicle Transition
('Manufacturing', 'Automotive', 'operations', 'ev_production_percent', '{"description": "EV as percentage of production"}',
    5, 10, 18, 28, 40, 55,
    21, 15, 200,
    'percentage', NULL, '2025', 'Global', 'All',
    'EV Manufacturing Report', 0.80, '2025-01-01', '2025-12-31'),

-- Automotive Supply Chain Tiers
('Manufacturing', 'Automotive', 'vendor', 'tier1_supplier_count', '{"description": "Number of Tier 1 suppliers"}',
    50, 100, 200, 350, 500, 750,
    245, 180, 100,
    'count', NULL, 'current', 'Global', 'OEM',
    'Automotive Supply Study', 0.80, '2025-01-01', '2025-12-31'),

-- Quality Metrics
('Manufacturing', 'Automotive', 'performance', 'warranty_claim_rate', '{"description": "Warranty claims per 100 vehicles"}',
    50, 75, 100, 150, 200, 300,
    115, 65, 500,
    'claims_per_100', NULL, 'annual', 'Global', 'All',
    'J.D. Power Quality Study', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- AEROSPACE & DEFENSE BENCHMARKS
-- ================================================================

-- Production Backlog
('Manufacturing', 'Aerospace', 'operations', 'production_backlog_years', '{"description": "Years of production backlog"}',
    5, 8, 13, 16, 18, 20,
    12.5, 4.5, 50,
    'years', NULL, 'current', 'Global', 'Major OEMs',
    'Aerospace Industry Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Supply Chain Complexity
('Manufacturing', 'Aerospace', 'vendor', 'supplier_count_total', '{"description": "Total number of suppliers"}',
    500, 2000, 5000, 10000, 15000, 20000,
    6500, 5500, 50,
    'count', NULL, 'current', 'Global', 'Major OEMs',
    'Aerospace Supply Chain Study', 0.80, '2025-01-01', '2025-12-31'),

-- Compliance and Certification
('Manufacturing', 'Aerospace', 'compliance', 'as9100_certification_cost', '{"description": "AS9100 certification cost"}',
    15000, 25000, 40000, 60000, 85000, 120000,
    45000, 25000, 200,
    'USD', 'USD', 'initial', 'Global', 'All',
    'Aerospace Compliance Study', 0.80, '2025-01-01', '2025-12-31'),

('Manufacturing', 'Aerospace', 'compliance', 'itar_compliance_cost', '{"description": "Annual ITAR compliance cost"}',
    50000, 100000, 250000, 500000, 750000, 1000000,
    320000, 280000, 150,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Defense Compliance Report', 0.80, '2025-01-01', '2025-12-31'),

-- Material Costs
('Manufacturing', 'Aerospace', 'pricing', 'titanium_cost_per_kg', '{"description": "Titanium cost per kilogram"}',
    30, 40, 55, 70, 85, 100,
    58, 20, 100,
    'USD/kg', 'USD', 'current', 'Global', 'All',
    'Material Pricing Index 2024', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'Aerospace', 'pricing', 'aluminum_cost_per_kg', '{"description": "Aerospace aluminum cost per kilogram"}',
    3, 4, 5.5, 7, 9, 12,
    5.8, 2.2, 100,
    'USD/kg', 'USD', 'current', 'Global', 'All',
    'Material Pricing Index 2024', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- GENERAL MANUFACTURING BENCHMARKS
-- ================================================================

-- Procurement and Sourcing
('Manufacturing', 'All', 'procurement', 'procurement_cost_savings', '{"description": "Annual procurement cost savings"}',
    2, 5, 8, 12, 15, 20,
    8.5, 4.5, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Procurement Benchmark Study', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'procurement', 'strategic_sourcing_percent', '{"description": "Spend under strategic sourcing"}',
    30, 45, 60, 75, 85, 92,
    61, 18, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Strategic Sourcing Report', 0.80, '2025-01-01', '2025-12-31'),

-- Contract Management
('Manufacturing', 'All', 'contract', 'supplier_contract_duration', '{"description": "Average supplier contract duration"}',
    6, 12, 24, 36, 48, 60,
    26, 14, 1000,
    'months', NULL, 'current', 'Global', 'All',
    'Supplier Contract Study', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'contract', 'master_agreement_percent', '{"description": "Suppliers under master agreements"}',
    40, 55, 70, 82, 90, 95,
    68, 16, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Contract Management Survey', 0.80, '2025-01-01', '2025-12-31'),

-- Tariff and Trade Impact
('Manufacturing', 'All', 'risk', 'tariff_concern_rate', '{"description": "Suppliers concerned about tariffs"}',
    40, 50, 60, 70, 80, 90,
    62, 15, 500,
    'percentage', NULL, '2025', 'USA', 'All',
    'Manufacturing Trade Survey', 0.80, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'risk', 'tariff_cost_impact', '{"description": "Tariff impact on costs"}',
    2, 5, 8, 12, 18, 25,
    9.5, 6, 500,
    'percentage', NULL, '2025', 'USA', 'All',
    'Trade Impact Analysis', 0.75, '2025-01-01', '2025-12-31'),

-- ================================================================
-- QUALITY MANAGEMENT BENCHMARKS
-- ================================================================

-- Quality Metrics
('Manufacturing', 'All', 'performance', 'first_pass_yield', '{"description": "First pass yield rate"}',
    85, 90, 94, 97, 98.5, 99.5,
    93.5, 4.5, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Quality Management Report', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'performance', 'cost_of_quality_percent', '{"description": "Cost of quality as % of revenue"}',
    2, 3, 4.5, 6, 8, 12,
    4.8, 2.5, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Quality Cost Study', 0.85, '2025-01-01', '2025-12-31'),

-- ISO Certification
('Manufacturing', 'All', 'compliance', 'iso9001_certification_cost', '{"description": "ISO 9001 certification cost"}',
    5000, 10000, 20000, 35000, 50000, 75000,
    24000, 18000, 500,
    'USD', 'USD', 'initial', 'Global', 'SMB',
    'ISO Certification Survey', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- LOGISTICS AND WAREHOUSING BENCHMARKS
-- ================================================================

-- Logistics Costs
('Manufacturing', 'All', 'spend', 'logistics_cost_percent_revenue', '{"description": "Logistics cost as % of revenue"}',
    4, 6, 8, 11, 14, 18,
    8.5, 3.5, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Logistics Cost Study', 0.85, '2025-01-01', '2025-12-31'),

-- Warehousing
('Manufacturing', 'All', 'operations', 'warehouse_utilization_rate', '{"description": "Warehouse space utilization"}',
    60, 70, 80, 88, 92, 95,
    79, 10, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Warehousing Survey', 0.80, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'operations', 'order_fulfillment_accuracy', '{"description": "Order fulfillment accuracy rate"}',
    95, 97, 98.5, 99.2, 99.7, 99.9,
    98.3, 1.5, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Fulfillment Metrics Study', 0.85, '2025-01-01', '2025-12-31'),

-- Shipping and Transportation
('Manufacturing', 'All', 'operations', 'freight_cost_per_unit', '{"description": "Average freight cost per unit"}',
    5, 10, 18, 30, 45, 65,
    22, 15, 1000,
    'USD', 'USD', 'per_unit', 'USA', 'All',
    'Transportation Cost Survey', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- SUSTAINABILITY AND ESG BENCHMARKS
-- ================================================================

-- Environmental Metrics
('Manufacturing', 'All', 'compliance', 'carbon_footprint_reduction_target', '{"description": "Carbon footprint reduction target"}',
    10, 20, 30, 40, 50, 60,
    32, 12, 500,
    'percentage', NULL, '2030', 'Global', 'All',
    'Sustainability Report 2024', 0.80, '2025-01-01', '2030-12-31'),

('Manufacturing', 'All', 'compliance', 'renewable_energy_percent', '{"description": "Renewable energy usage"}',
    5, 15, 25, 40, 55, 70,
    28, 18, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Energy Usage Survey', 0.80, '2025-01-01', '2025-12-31'),

-- Waste Management
('Manufacturing', 'All', 'operations', 'waste_recycling_rate', '{"description": "Waste recycling rate"}',
    40, 55, 70, 82, 90, 95,
    68, 16, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Waste Management Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- TECHNOLOGY AND AUTOMATION BENCHMARKS
-- ================================================================

-- Industry 4.0 Adoption
('Manufacturing', 'All', 'operations', 'iot_adoption_rate', '{"description": "IoT adoption in manufacturing"}',
    20, 35, 50, 65, 75, 85,
    51, 18, 1000,
    'percentage', NULL, '2025', 'Global', 'All',
    'Industry 4.0 Survey', 0.85, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'operations', 'robotic_automation_percent', '{"description": "Processes with robotic automation"}',
    5, 15, 25, 40, 55, 70,
    28, 18, 500,
    'percentage', NULL, 'current', 'Global', 'All',
    'Automation Study 2024', 0.80, '2025-01-01', '2025-12-31'),

-- Predictive Maintenance
('Manufacturing', 'All', 'operations', 'predictive_maintenance_adoption', '{"description": "Using predictive maintenance"}',
    15, 25, 40, 55, 70, 80,
    42, 20, 500,
    'percentage', NULL, '2025', 'Global', 'All',
    'Maintenance Technology Survey', 0.80, '2025-01-01', '2025-12-31'),

('Manufacturing', 'All', 'performance', 'unplanned_downtime_reduction', '{"description": "Reduction in unplanned downtime"}',
    10, 20, 30, 45, 60, 75,
    33, 18, 300,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Predictive Maintenance ROI Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- WORKFORCE AND LABOR BENCHMARKS
-- ================================================================

-- Labor Productivity
('Manufacturing', 'All', 'performance', 'revenue_per_employee', '{"description": "Revenue per manufacturing employee"}',
    150000, 200000, 275000, 350000, 450000, 600000,
    285000, 125000, 1000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Manufacturing Productivity Report', 0.85, '2025-01-01', '2025-12-31'),

-- Skills Gap
('Manufacturing', 'All', 'staffing', 'skills_gap_concern_rate', '{"description": "Manufacturers citing skills gap"}',
    60, 70, 80, 88, 92, 95,
    78, 10, 500,
    'percentage', NULL, '2025', 'USA', 'All',
    'Manufacturing Skills Survey', 0.85, '2025-01-01', '2025-12-31'),

-- Training Investment
('Manufacturing', 'All', 'spend', 'training_spend_per_employee', '{"description": "Annual training spend per employee"}',
    500, 800, 1200, 1800, 2500, 3500,
    1350, 750, 500,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Workforce Development Study', 0.80, '2025-01-01', '2025-12-31');