-- HTS Reference Data Seed Script
-- This script seeds the tariff reference tables with initial data for the tariff module
-- Run this after running migrations 126-129

-- ============================================================================
-- IMPORTANT: This script contains 2025 tariff rates and rules
-- Rates should be updated periodically as trade policy changes
-- ============================================================================

-- ============================================================================
-- COUNTRY TARIFF RULES (2025 Rates)
-- ============================================================================

-- Clear existing data (optional - comment out if appending)
-- DELETE FROM country_tariff_rules;

INSERT INTO country_tariff_rules (
    country_code, country_name, base_additional_rate, ieepa_rate, reciprocal_rate,
    is_usmca_country, has_fta, fta_name, notes, effective_date
) VALUES
    -- USMCA Countries
    ('CA', 'Canada', 25.00, 0, 0, true, true, 'USMCA', 'USMCA partner - 25% base tariff for non-qualifying goods', '2025-03-04'),
    ('MX', 'Mexico', 25.00, 0, 0, true, true, 'USMCA', 'USMCA partner - 25% base tariff for non-qualifying goods', '2025-03-04'),

    -- Major Trade Partners with IEEPA Rates
    ('CN', 'China', 0, 20.00, 34.00, false, false, NULL, 'IEEPA 20% + Reciprocal 34% = 54% additional tariff', '2025-02-04'),
    ('HK', 'Hong Kong', 0, 20.00, 34.00, false, false, NULL, 'Same rates as China', '2025-02-04'),
    ('MO', 'Macau', 0, 20.00, 34.00, false, false, NULL, 'Same rates as China', '2025-02-04'),

    -- Countries with IEEPA Rates Only
    ('VN', 'Vietnam', 0, 10.00, 46.00, false, false, NULL, 'IEEPA 10% + Reciprocal 46%', '2025-04-01'),
    ('TH', 'Thailand', 0, 10.00, 36.00, false, false, NULL, 'IEEPA 10% + Reciprocal 36%', '2025-04-01'),
    ('MY', 'Malaysia', 0, 10.00, 24.00, false, false, NULL, 'IEEPA 10% + Reciprocal 24%', '2025-04-01'),
    ('ID', 'Indonesia', 0, 10.00, 32.00, false, false, NULL, 'IEEPA 10% + Reciprocal 32%', '2025-04-01'),
    ('PH', 'Philippines', 0, 10.00, 17.00, false, false, NULL, 'IEEPA 10% + Reciprocal 17%', '2025-04-01'),
    ('IN', 'India', 0, 10.00, 26.00, false, false, NULL, 'IEEPA 10% + Reciprocal 26%', '2025-04-01'),
    ('BD', 'Bangladesh', 0, 10.00, 37.00, false, false, NULL, 'IEEPA 10% + Reciprocal 37%', '2025-04-01'),
    ('PK', 'Pakistan', 0, 10.00, 29.00, false, false, NULL, 'IEEPA 10% + Reciprocal 29%', '2025-04-01'),
    ('LK', 'Sri Lanka', 0, 10.00, 44.00, false, false, NULL, 'IEEPA 10% + Reciprocal 44%', '2025-04-01'),
    ('KH', 'Cambodia', 0, 10.00, 49.00, false, false, NULL, 'IEEPA 10% + Reciprocal 49%', '2025-04-01'),
    ('MM', 'Myanmar', 0, 10.00, 44.00, false, false, NULL, 'IEEPA 10% + Reciprocal 44%', '2025-04-01'),

    -- European Union Countries (Individual country rates)
    ('DE', 'Germany', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('FR', 'France', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('IT', 'Italy', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('ES', 'Spain', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('NL', 'Netherlands', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('BE', 'Belgium', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('PL', 'Poland', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('CZ', 'Czech Republic', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('AT', 'Austria', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('SE', 'Sweden', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('DK', 'Denmark', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('FI', 'Finland', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('IE', 'Ireland', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('PT', 'Portugal', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('GR', 'Greece', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('HU', 'Hungary', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('RO', 'Romania', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('SK', 'Slovakia', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('BG', 'Bulgaria', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('HR', 'Croatia', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('SI', 'Slovenia', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('LT', 'Lithuania', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('LV', 'Latvia', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('EE', 'Estonia', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('CY', 'Cyprus', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('LU', 'Luxembourg', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),
    ('MT', 'Malta', 0, 10.00, 20.00, false, false, NULL, 'EU member - IEEPA 10% + Reciprocal 20%', '2025-04-01'),

    -- United Kingdom
    ('GB', 'United Kingdom', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),

    -- Other Major Partners
    ('JP', 'Japan', 0, 10.00, 24.00, false, true, 'US-Japan Trade Agreement', 'IEEPA 10% + Reciprocal 24%', '2025-04-01'),
    ('KR', 'South Korea', 0, 10.00, 25.00, false, true, 'KORUS FTA', 'IEEPA 10% + Reciprocal 25%', '2025-04-01'),
    ('TW', 'Taiwan', 0, 10.00, 32.00, false, false, NULL, 'IEEPA 10% + Reciprocal 32%', '2025-04-01'),
    ('SG', 'Singapore', 0, 10.00, 10.00, false, true, 'US-Singapore FTA', 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('AU', 'Australia', 0, 10.00, 10.00, false, true, 'US-Australia FTA', 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('NZ', 'New Zealand', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('IL', 'Israel', 0, 10.00, 17.00, false, true, 'US-Israel FTA', 'IEEPA 10% + Reciprocal 17%', '2025-04-01'),
    ('TR', 'Turkey', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('BR', 'Brazil', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('AR', 'Argentina', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('CL', 'Chile', 0, 10.00, 10.00, false, true, 'US-Chile FTA', 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('CO', 'Colombia', 0, 10.00, 10.00, false, true, 'US-Colombia TPA', 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('PE', 'Peru', 0, 10.00, 10.00, false, true, 'US-Peru TPA', 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('ZA', 'South Africa', 0, 10.00, 30.00, false, false, NULL, 'IEEPA 10% + Reciprocal 30%', '2025-04-01'),
    ('EG', 'Egypt', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('AE', 'United Arab Emirates', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),
    ('SA', 'Saudi Arabia', 0, 10.00, 10.00, false, false, NULL, 'IEEPA 10% + Reciprocal 10%', '2025-04-01'),

    -- Default for unspecified countries
    ('DEFAULT', 'Default', 0, 10.00, 10.00, false, false, NULL, 'Default rate for countries not listed', '2025-04-01')
ON CONFLICT (country_code) DO UPDATE SET
    country_name = EXCLUDED.country_name,
    base_additional_rate = EXCLUDED.base_additional_rate,
    ieepa_rate = EXCLUDED.ieepa_rate,
    reciprocal_rate = EXCLUDED.reciprocal_rate,
    is_usmca_country = EXCLUDED.is_usmca_country,
    has_fta = EXCLUDED.has_fta,
    fta_name = EXCLUDED.fta_name,
    notes = EXCLUDED.notes,
    effective_date = EXCLUDED.effective_date,
    updated_at = NOW();

-- ============================================================================
-- PRODUCT-SPECIFIC TARIFFS (Section 232 - Steel/Aluminum)
-- ============================================================================

INSERT INTO product_specific_tariffs (
    hts_chapter, hts_heading, additional_rate, tariff_type, description, effective_date
) VALUES
    -- Section 232 Steel (25% tariff)
    ('72', NULL, 25.00, 'section_232', 'Iron and Steel - Section 232', '2018-03-23'),
    ('73', NULL, 25.00, 'section_232', 'Articles of Iron or Steel - Section 232', '2018-03-23'),

    -- Section 232 Aluminum (10% tariff)
    ('76', NULL, 10.00, 'section_232', 'Aluminum and Articles Thereof - Section 232', '2018-03-23'),

    -- Derivative Steel Products
    ('7304', NULL, 25.00, 'section_232_derivative', 'Steel Tubes/Pipes - Section 232 Derivative', '2020-02-08'),
    ('7306', NULL, 25.00, 'section_232_derivative', 'Steel Tubes/Pipes (Welded) - Section 232 Derivative', '2020-02-08'),
    ('7317', NULL, 25.00, 'section_232_derivative', 'Steel Nails/Tacks - Section 232 Derivative', '2020-02-08'),
    ('7318', NULL, 25.00, 'section_232_derivative', 'Steel Screws/Bolts - Section 232 Derivative', '2020-02-08'),

    -- Derivative Aluminum Products
    ('7616', NULL, 10.00, 'section_232_derivative', 'Other Aluminum Articles - Section 232 Derivative', '2020-02-08')
ON CONFLICT (hts_chapter, hts_heading, tariff_type) DO UPDATE SET
    additional_rate = EXCLUDED.additional_rate,
    description = EXCLUDED.description,
    effective_date = EXCLUDED.effective_date,
    updated_at = NOW();

-- ============================================================================
-- SAMPLE HTS CODES (Common items for testing)
-- In production, import full HTS database from USITC
-- ============================================================================

INSERT INTO hts_codes (
    code, description, chapter, heading, subheading, general_rate, general_rate_numeric, unit, notes
) VALUES
    -- Electronics
    ('8471.30.0100', 'Portable automatic data processing machines, weighing not more than 10 kg', '84', '8471', '847130', 'Free', 0.00, 'No.', 'Laptops and notebooks'),
    ('8471.41.0150', 'Other automatic data processing machines, comprising CPU and I/O unit', '84', '8471', '847141', 'Free', 0.00, 'No.', 'Desktop computers'),
    ('8517.12.0050', 'Telephones for cellular networks or other wireless networks', '85', '8517', '851712', 'Free', 0.00, 'No.', 'Smartphones and mobile phones'),
    ('8528.72.6400', 'Color television reception apparatus', '85', '8528', '852872', '5%', 5.00, 'No.', 'Flat panel displays and TVs'),
    ('8443.32.1090', 'Printers, copying machines, and facsimile machines', '84', '8443', '844332', 'Free', 0.00, 'No.', 'Printers'),
    ('8471.60.9050', 'Input or output units for automatic data processing machines', '84', '8471', '847160', 'Free', 0.00, 'No.', 'Computer peripherals'),

    -- Textiles and Apparel
    ('6109.10.0010', 'T-shirts, singlets, tank tops, of cotton, knitted or crocheted', '61', '6109', '610910', '16.5%', 16.50, 'doz.', 'Cotton t-shirts'),
    ('6110.20.2075', 'Sweaters, pullovers, cardigans, of cotton', '61', '6110', '611020', '16.5%', 16.50, 'doz.', 'Cotton sweaters'),
    ('6203.42.4011', 'Men''s or boys'' trousers, of cotton, not knitted', '62', '6203', '620342', '16.6%', 16.60, 'doz.', 'Cotton pants'),
    ('6204.62.4011', 'Women''s or girls'' trousers, of cotton, not knitted', '62', '6204', '620462', '16.6%', 16.60, 'doz.', 'Women''s cotton pants'),
    ('6403.99.9065', 'Footwear with outer soles of rubber, plastics, leather', '64', '6403', '640399', '10%', 10.00, 'prs.', 'Leather footwear'),

    -- Machinery and Equipment
    ('8414.30.8080', 'Compressors used in refrigerating equipment', '84', '8414', '841430', 'Free', 0.00, 'No.', 'Refrigeration compressors'),
    ('8421.21.0000', 'Water filtering or purifying machinery', '84', '8421', '842121', 'Free', 0.00, 'No.', 'Water filters'),
    ('8481.80.9050', 'Taps, cocks, valves for pipes, tanks', '84', '8481', '848180', '5.7%', 5.70, 'No.', 'Industrial valves'),
    ('8501.10.4060', 'Electric motors of an output not exceeding 37.5 W', '85', '8501', '850110', '4.4%', 4.40, 'No.', 'Small electric motors'),
    ('8544.42.9090', 'Electric conductors for voltage not exceeding 1,000 V', '85', '8544', '854442', '2.6%', 2.60, 'kg', 'Electrical cables'),

    -- Vehicles and Parts
    ('8703.23.0175', 'Motor cars with spark-ignition engine, 1500-3000 cc', '87', '8703', '870323', '2.5%', 2.50, 'No.', 'Passenger vehicles'),
    ('8708.29.5060', 'Parts and accessories of motor vehicle bodies', '87', '8708', '870829', '2.5%', 2.50, 'kg', 'Auto body parts'),
    ('8714.10.0050', 'Parts and accessories of motorcycles', '87', '8714', '871410', 'Free', 0.00, 'kg', 'Motorcycle parts'),

    -- Chemicals and Plastics
    ('3901.10.1000', 'Polyethylene having specific gravity less than 0.94', '39', '3901', '390110', '6.5%', 6.50, 'kg', 'LDPE'),
    ('3902.10.0000', 'Polypropylene in primary forms', '39', '3902', '390210', '6.5%', 6.50, 'kg', 'Polypropylene'),
    ('3926.90.9990', 'Other articles of plastics', '39', '3926', '392690', '5.3%', 5.30, 'kg', 'Plastic articles'),

    -- Steel and Aluminum (Section 232 products)
    ('7210.41.0000', 'Flat-rolled products of iron or steel, zinc-coated', '72', '7210', '721041', 'Free', 0.00, 'kg', 'Galvanized steel sheets'),
    ('7304.19.1020', 'Line pipe of iron or steel, seamless', '73', '7304', '730419', 'Free', 0.00, 'kg', 'Steel line pipe'),
    ('7318.15.2000', 'Screws and bolts of iron or steel', '73', '7318', '731815', '8.6%', 8.60, 'kg', 'Steel fasteners'),
    ('7606.12.3090', 'Aluminum plates, sheets, strip, rectangular', '76', '7606', '760612', '3%', 3.00, 'kg', 'Aluminum sheets'),

    -- Food and Agriculture
    ('0201.30.0200', 'Meat of bovine animals, fresh or chilled, boneless', '02', '0201', '020130', '4.4 cents/kg', 4.40, 'kg', 'Beef, fresh boneless'),
    ('0803.90.0045', 'Bananas, fresh', '08', '0803', '080390', 'Free', 0.00, 'kg', 'Fresh bananas'),
    ('0901.21.0015', 'Coffee, roasted, not decaffeinated', '09', '0901', '090121', 'Free', 0.00, 'kg', 'Roasted coffee'),
    ('2204.21.8045', 'Wine of fresh grapes, in containers 2 liters or less', '22', '2204', '220421', '6.3 cents/liter', 0.10, 'liters', 'Table wine'),

    -- Furniture
    ('9401.30.8011', 'Swivel seats with variable height adjustment', '94', '9401', '940130', 'Free', 0.00, 'No.', 'Office chairs'),
    ('9403.20.0078', 'Metal furniture, other than for office use', '94', '9403', '940320', 'Free', 0.00, 'No.', 'Metal furniture'),
    ('9403.60.8081', 'Wooden furniture, other than bedroom, office, kitchen', '94', '9403', '940360', 'Free', 0.00, 'No.', 'Wooden furniture')

ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    chapter = EXCLUDED.chapter,
    heading = EXCLUDED.heading,
    subheading = EXCLUDED.subheading,
    general_rate = EXCLUDED.general_rate,
    general_rate_numeric = EXCLUDED.general_rate_numeric,
    unit = EXCLUDED.unit,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ============================================================================
-- UPDATE FULL-TEXT SEARCH VECTORS
-- ============================================================================

UPDATE hts_codes
SET search_vector = to_tsvector('english', coalesce(code, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, ''))
WHERE search_vector IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify country rules
SELECT 'Country Tariff Rules' as table_name, COUNT(*) as row_count FROM country_tariff_rules;

-- Verify product-specific tariffs
SELECT 'Product-Specific Tariffs' as table_name, COUNT(*) as row_count FROM product_specific_tariffs;

-- Verify HTS codes
SELECT 'HTS Codes' as table_name, COUNT(*) as row_count FROM hts_codes;

-- Sample tariff calculation test
SELECT
    'Test Calculation - China Steel' as test,
    calculate_total_tariff_rate('7318.15.2000', 'CN', false) as result;

SELECT
    'Test Calculation - Canada USMCA' as test,
    calculate_total_tariff_rate('8471.30.0100', 'CA', true) as result;

SELECT
    'Test Calculation - Canada Non-USMCA' as test,
    calculate_total_tariff_rate('8471.30.0100', 'CA', false) as result;

-- ============================================================================
-- NOTES FOR FULL PRODUCTION DEPLOYMENT
-- ============================================================================
--
-- For production deployment, you should:
-- 1. Import full HTS code database from USITC (https://www.usitc.gov/)
-- 2. Set up scheduled job to update tariff rates when they change
-- 3. Generate embeddings for HTS code semantic search using OpenAI
-- 4. Add Section 301 exclusions from USTR
--
-- Example embedding generation (run separately with API key):
-- SELECT generate_hts_embeddings();
--
-- ============================================================================
