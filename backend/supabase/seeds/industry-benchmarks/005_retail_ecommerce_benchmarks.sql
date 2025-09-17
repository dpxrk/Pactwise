-- ================================================================
-- RETAIL & E-COMMERCE SECTOR INDUSTRY BENCHMARKS
-- Based on comprehensive 2024-2025 market research
-- ================================================================

-- Clear existing retail/e-commerce sector data
DELETE FROM industry_benchmarks_master WHERE industry IN ('Retail', 'E-commerce');

-- ================================================================
-- E-COMMERCE PLATFORM BENCHMARKS
-- ================================================================

-- Platform Performance
INSERT INTO industry_benchmarks_master (
    industry, sub_industry, metric_category, metric_name, metric_value,
    p10_value, p25_value, p50_value, p75_value, p90_value, p95_value,
    mean_value, std_deviation, sample_size,
    unit, currency, time_period, geographic_region, company_size_segment,
    source, confidence_level, effective_date, expires_date
) VALUES
-- Amazon Seller Performance
('E-commerce', 'Marketplace', 'performance', 'amazon_seller_annual_revenue', '{"description": "Average Amazon seller annual revenue"}',
    25000, 75000, 290000, 500000, 1000000, 5000000,
    425000, 850000, 10000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Amazon Seller Report 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Conversion Rates
('E-commerce', 'All', 'performance', 'ecommerce_conversion_rate', '{"description": "E-commerce conversion rate"}',
    0.5, 1.0, 2.2, 3.5, 5.0, 7.0,
    2.5, 1.5, 5000,
    'percentage', NULL, 'current', 'Global', 'All',
    'E-commerce Metrics Study 2024', 0.85, '2025-01-01', '2025-12-31'),

-- Average Order Value
('E-commerce', 'All', 'performance', 'average_order_value', '{"description": "Average order value"}',
    25, 45, 75, 120, 180, 250,
    85, 55, 5000,
    'USD', 'USD', 'current', 'USA', 'All',
    'E-commerce Benchmark Report', 0.85, '2025-01-01', '2025-12-31'),

-- Cart Abandonment
('E-commerce', 'All', 'performance', 'cart_abandonment_rate', '{"description": "Shopping cart abandonment rate"}',
    55, 62, 70, 78, 82, 88,
    69.8, 8.5, 3000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Cart Abandonment Study 2024', 0.90, '2025-01-01', '2025-12-31'),

-- ================================================================
-- DROPSHIPPING BENCHMARKS
-- ================================================================

-- Dropshipping Economics
('E-commerce', 'Dropshipping', 'pricing', 'dropship_profit_margin', '{"description": "Dropshipping profit margin"}',
    8, 12, 20, 30, 40, 50,
    22, 11, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Dropshipping Industry Report', 0.80, '2025-01-01', '2025-12-31'),

('E-commerce', 'Dropshipping', 'pricing', 'dropship_markup_percent', '{"description": "Dropshipping markup percentage"}',
    25, 50, 100, 150, 200, 300,
    115, 65, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Dropshipping Pricing Study', 0.80, '2025-01-01', '2025-12-31'),

-- Supplier Terms
('E-commerce', 'Dropshipping', 'operations', 'dropship_processing_days', '{"description": "Dropship order processing time"}',
    1, 2, 3, 5, 7, 10,
    3.8, 2.2, 1000,
    'days', NULL, 'per_order', 'Global', 'All',
    'Dropshipping Operations Study', 0.80, '2025-01-01', '2025-12-31'),

('E-commerce', 'Dropshipping', 'operations', 'dropship_shipping_days', '{"description": "Dropship shipping time to customer"}',
    7, 10, 14, 21, 28, 35,
    16, 8, 1000,
    'days', NULL, 'per_order', 'Global', 'All',
    'Dropshipping Fulfillment Report', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- WHOLESALE AGREEMENTS BENCHMARKS
-- ================================================================

-- Wholesale Pricing
('Retail', 'Wholesale', 'pricing', 'wholesale_discount_percent', '{"description": "Wholesale discount from retail"}',
    30, 40, 50, 60, 65, 70,
    48, 12, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Wholesale Pricing Survey', 0.85, '2025-01-01', '2025-12-31'),

-- Minimum Orders
('Retail', 'Wholesale', 'contract', 'minimum_order_value', '{"description": "Minimum wholesale order value"}',
    100, 250, 500, 1000, 2500, 5000,
    850, 1200, 1000,
    'USD', 'USD', 'per_order', 'USA', 'All',
    'Wholesale Terms Study', 0.80, '2025-01-01', '2025-12-31'),

('Retail', 'Wholesale', 'contract', 'minimum_order_quantity', '{"description": "Minimum order quantity"}',
    12, 24, 50, 100, 250, 500,
    95, 125, 1000,
    'units', NULL, 'per_order', 'Global', 'All',
    'Wholesale Requirements Survey', 0.80, '2025-01-01', '2025-12-31'),

-- Payment Terms
('Retail', 'Wholesale', 'contract', 'wholesale_payment_terms_days', '{"description": "Wholesale payment terms"}',
    0, 15, 30, 45, 60, 90,
    32, 20, 1000,
    'days', NULL, 'net_terms', 'USA', 'All',
    'Wholesale Payment Study', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- RETAIL OPERATIONS BENCHMARKS
-- ================================================================

-- Store Operations
('Retail', 'Brick & Mortar', 'operations', 'sales_per_square_foot', '{"description": "Annual sales per square foot"}',
    150, 250, 400, 600, 850, 1200,
    450, 280, 2000,
    'USD/sqft', 'USD', 'annual', 'USA', 'All',
    'Retail Operations Study', 0.85, '2025-01-01', '2025-12-31'),

('Retail', 'Brick & Mortar', 'operations', 'inventory_shrinkage_rate', '{"description": "Inventory shrinkage rate"}',
    0.5, 0.8, 1.4, 2.0, 2.8, 3.5,
    1.5, 0.8, 2000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'Retail Shrinkage Survey', 0.85, '2025-01-01', '2025-12-31'),

-- Staff Productivity
('Retail', 'Brick & Mortar', 'performance', 'sales_per_employee', '{"description": "Annual sales per employee"}',
    75000, 125000, 185000, 250000, 350000, 500000,
    195000, 95000, 2000,
    'USD', 'USD', 'annual', 'USA', 'All',
    'Retail Productivity Report', 0.85, '2025-01-01', '2025-12-31'),

-- Customer Metrics
('Retail', 'All', 'performance', 'customer_retention_rate', '{"description": "Annual customer retention rate"}',
    20, 35, 55, 72, 82, 90,
    54, 20, 2000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Customer Retention Study', 0.85, '2025-01-01', '2025-12-31'),

('Retail', 'All', 'performance', 'customer_lifetime_value', '{"description": "Customer lifetime value"}',
    50, 150, 350, 750, 1500, 3000,
    580, 650, 2000,
    'USD', 'USD', 'lifetime', 'USA', 'All',
    'Customer Value Analysis', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- CONSIGNMENT AGREEMENTS BENCHMARKS
-- ================================================================

-- Consignment Terms
('Retail', 'Consignment', 'contract', 'consignment_commission_rate', '{"description": "Consignment commission rate"}',
    20, 30, 40, 50, 60, 70,
    42, 13, 500,
    'percentage', NULL, 'current', 'USA', 'All',
    'Consignment Terms Survey', 0.80, '2025-01-01', '2025-12-31'),

('Retail', 'Consignment', 'contract', 'consignment_period_days', '{"description": "Consignment period duration"}',
    30, 60, 90, 120, 180, 365,
    105, 75, 500,
    'days', NULL, 'current', 'USA', 'All',
    'Consignment Agreement Study', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- FULFILLMENT AND LOGISTICS BENCHMARKS
-- ================================================================

-- Fulfillment Costs
('E-commerce', 'Fulfillment', 'spend', 'fulfillment_cost_per_order', '{"description": "Fulfillment cost per order"}',
    2.50, 4.00, 6.50, 9.00, 12.00, 16.00,
    7.20, 3.80, 2000,
    'USD', 'USD', 'per_order', 'USA', 'All',
    'Fulfillment Cost Study', 0.85, '2025-01-01', '2025-12-31'),

-- Shipping Metrics
('E-commerce', 'All', 'operations', 'free_shipping_threshold', '{"description": "Free shipping threshold"}',
    25, 35, 49, 75, 99, 150,
    58, 32, 2000,
    'USD', 'USD', 'current', 'USA', 'All',
    'Shipping Policy Survey', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'operations', 'shipping_as_percent_revenue', '{"description": "Shipping cost as % of revenue"}',
    5, 7, 10, 13, 16, 20,
    10.5, 4.2, 2000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'E-commerce Shipping Study', 0.85, '2025-01-01', '2025-12-31'),

-- Delivery Times
('E-commerce', 'All', 'operations', 'standard_delivery_days', '{"description": "Standard delivery time"}',
    3, 4, 5, 7, 9, 12,
    5.8, 2.5, 2000,
    'days', NULL, 'per_order', 'USA', 'All',
    'Delivery Time Study', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'operations', 'express_delivery_days', '{"description": "Express delivery time"}',
    1, 1, 2, 2, 3, 3,
    1.8, 0.7, 2000,
    'days', NULL, 'per_order', 'USA', 'All',
    'Express Shipping Survey', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- RETURNS AND REFUNDS BENCHMARKS
-- ================================================================

-- Return Rates
('E-commerce', 'All', 'operations', 'return_rate', '{"description": "Product return rate"}',
    8, 12, 18, 25, 32, 40,
    19.5, 9.5, 2000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Returns Management Study', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'Apparel', 'operations', 'apparel_return_rate', '{"description": "Apparel return rate"}',
    20, 25, 30, 38, 45, 52,
    32, 10, 1000,
    'percentage', NULL, 'annual', 'Global', 'All',
    'Fashion Returns Report', 0.85, '2025-01-01', '2025-12-31'),

-- Return Processing
('E-commerce', 'All', 'operations', 'return_processing_days', '{"description": "Return processing time"}',
    3, 5, 7, 10, 14, 21,
    8.5, 4.5, 2000,
    'days', NULL, 'per_return', 'USA', 'All',
    'Returns Processing Study', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'operations', 'return_processing_cost', '{"description": "Cost to process return"}',
    5, 8, 12, 18, 25, 35,
    14, 8, 2000,
    'USD', 'USD', 'per_return', 'USA', 'All',
    'Return Cost Analysis', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- MARKETING AND CUSTOMER ACQUISITION BENCHMARKS
-- ================================================================

-- Digital Marketing
('E-commerce', 'All', 'performance', 'customer_acquisition_cost', '{"description": "Customer acquisition cost"}',
    10, 25, 50, 85, 125, 200,
    58, 45, 2000,
    'USD', 'USD', 'per_customer', 'USA', 'All',
    'E-commerce CAC Study', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'spend', 'marketing_spend_percent_revenue', '{"description": "Marketing as % of revenue"}',
    5, 8, 12, 18, 25, 35,
    13.5, 7.5, 2000,
    'percentage', NULL, 'annual', 'USA', 'All',
    'E-commerce Marketing Survey', 0.85, '2025-01-01', '2025-12-31'),

-- Email Marketing
('E-commerce', 'All', 'performance', 'email_open_rate', '{"description": "Email marketing open rate"}',
    10, 15, 21, 28, 35, 42,
    22, 8, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Email Marketing Report', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'performance', 'email_conversion_rate', '{"description": "Email marketing conversion rate"}',
    0.5, 1.0, 2.5, 4.0, 6.0, 8.0,
    2.8, 1.8, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Email Marketing Report', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- PAYMENT PROCESSING BENCHMARKS
-- ================================================================

-- Payment Methods
('E-commerce', 'All', 'pricing', 'payment_processing_fee', '{"description": "Payment processing fee"}',
    2.0, 2.5, 2.9, 3.2, 3.5, 4.0,
    2.95, 0.5, 2000,
    'percentage', NULL, 'per_transaction', 'USA', 'All',
    'Payment Processing Survey', 0.90, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'operations', 'mobile_payment_percent', '{"description": "Mobile payment percentage"}',
    25, 35, 45, 58, 68, 78,
    47, 15, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Mobile Payment Study', 0.85, '2025-01-01', '2025-12-31'),

-- Fraud and Chargebacks
('E-commerce', 'All', 'risk', 'chargeback_rate', '{"description": "Chargeback rate"}',
    0.3, 0.5, 0.8, 1.2, 1.8, 2.5,
    0.9, 0.6, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Chargeback Report', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'All', 'risk', 'fraud_rate', '{"description": "E-commerce fraud rate"}',
    0.5, 0.8, 1.4, 2.0, 2.8, 3.5,
    1.5, 0.8, 2000,
    'percentage', NULL, 'current', 'Global', 'All',
    'E-commerce Fraud Study', 0.85, '2025-01-01', '2025-12-31'),

-- ================================================================
-- VENDOR MANAGEMENT BENCHMARKS
-- ================================================================

-- Vendor Performance
('Retail', 'All', 'vendor', 'vendor_on_time_delivery', '{"description": "Vendor on-time delivery rate"}',
    75, 82, 88, 93, 96, 98,
    87, 7, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Vendor Performance Study', 0.85, '2025-01-01', '2025-12-31'),

('Retail', 'All', 'vendor', 'vendor_fill_rate', '{"description": "Vendor order fill rate"}',
    85, 90, 94, 97, 98.5, 99.5,
    93.5, 4.5, 1000,
    'percentage', NULL, 'current', 'Global', 'All',
    'Vendor Fill Rate Study', 0.85, '2025-01-01', '2025-12-31'),

-- Vendor Contracts
('Retail', 'All', 'contract', 'vendor_contract_duration', '{"description": "Vendor contract duration"}',
    6, 12, 24, 36, 48, 60,
    25, 14, 1000,
    'months', NULL, 'current', 'Global', 'All',
    'Vendor Contract Survey', 0.80, '2025-01-01', '2025-12-31'),

-- ================================================================
-- SUBSCRIPTION COMMERCE BENCHMARKS
-- ================================================================

-- Subscription Metrics
('E-commerce', 'Subscription', 'performance', 'monthly_churn_rate', '{"description": "Monthly subscription churn rate"}',
    3, 5, 8, 12, 16, 20,
    8.5, 4.5, 500,
    'percentage', NULL, 'monthly', 'Global', 'All',
    'Subscription Commerce Report', 0.85, '2025-01-01', '2025-12-31'),

('E-commerce', 'Subscription', 'performance', 'subscription_ltv', '{"description": "Subscription customer LTV"}',
    100, 200, 400, 700, 1200, 2000,
    520, 450, 500,
    'USD', 'USD', 'lifetime', 'USA', 'All',
    'Subscription LTV Study', 0.80, '2025-01-01', '2025-12-31');