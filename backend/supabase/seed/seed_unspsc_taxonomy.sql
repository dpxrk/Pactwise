-- ============================================================================
-- UNSPSC Taxonomy Seed Data
-- Universal Standard Products and Services Classification
-- ============================================================================
-- This seed provides a representative subset of the UNSPSC taxonomy
-- covering the most commonly used business categories.
-- Full UNSPSC has ~86,000 codes across 5 levels:
-- Level 1: Segment (2 digits)
-- Level 2: Family (4 digits)
-- Level 3: Class (6 digits)
-- Level 4: Commodity (8 digits)
-- Level 5: Business Function (11 digits - optional)
-- ============================================================================

-- First, clear existing data (if any)
TRUNCATE TABLE product_service_taxonomy CASCADE;

-- ============================================================================
-- SEGMENT LEVEL (Level 1) - 2 digit codes
-- ============================================================================

INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
-- Live Plant and Animal Material
('10', 'Live Plant and Animal Material and Accessories and Supplies', 'Living organisms and related products', 1, NULL, ARRAY['plants', 'animals', 'livestock', 'agriculture'], ARRAY['flora', 'fauna', 'livestock']),

-- Mineral and Textile Materials
('11', 'Mineral and Textile and Inedible Plant and Animal Materials', 'Raw materials for manufacturing', 1, NULL, ARRAY['minerals', 'textiles', 'raw materials', 'fiber'], ARRAY['fabrics', 'raw goods']),

-- Chemicals
('12', 'Chemicals including Bio Chemicals and Gas Materials', 'Chemical products and compounds', 1, NULL, ARRAY['chemicals', 'compounds', 'gases', 'biochemicals'], ARRAY['reagents', 'substances']),

-- Pharmaceutical
('51', 'Drugs and Pharmaceutical Products', 'Medications and pharmaceutical items', 1, NULL, ARRAY['drugs', 'pharmaceuticals', 'medicine', 'medication'], ARRAY['medications', 'pharma']),

-- Food and Beverage
('50', 'Food Beverage and Tobacco Products', 'Consumable products', 1, NULL, ARRAY['food', 'beverage', 'drinks', 'tobacco'], ARRAY['consumables', 'provisions']),

-- Apparel and Luggage
('53', 'Apparel and Luggage and Personal Care Products', 'Clothing and personal items', 1, NULL, ARRAY['clothing', 'apparel', 'luggage', 'personal care'], ARRAY['garments', 'wear']),

-- Building Materials
('30', 'Structures and Building and Construction and Manufacturing Components and Supplies', 'Construction materials', 1, NULL, ARRAY['construction', 'building', 'materials', 'structures'], ARRAY['building supplies', 'construction materials']),

-- Industrial Equipment
('23', 'Industrial Manufacturing and Processing Machinery and Accessories', 'Manufacturing equipment', 1, NULL, ARRAY['machinery', 'manufacturing', 'industrial', 'processing'], ARRAY['equipment', 'machines']),

-- IT Equipment
('43', 'Information Technology Broadcasting and Telecommunications', 'IT and telecom equipment', 1, NULL, ARRAY['IT', 'technology', 'computers', 'telecommunications', 'software'], ARRAY['tech', 'computing', 'telecom']),

-- Office Equipment
('44', 'Office Equipment and Accessories and Supplies', 'Office supplies and equipment', 1, NULL, ARRAY['office', 'supplies', 'equipment', 'stationery'], ARRAY['office supplies', 'stationary']),

-- Transportation
('25', 'Commercial and Military and Private Vehicles and their Accessories and Components', 'Vehicles and transportation', 1, NULL, ARRAY['vehicles', 'transportation', 'automotive', 'cars'], ARRAY['transport', 'automobiles']),

-- Medical Equipment
('42', 'Medical Equipment and Accessories and Supplies', 'Healthcare equipment and supplies', 1, NULL, ARRAY['medical', 'healthcare', 'clinical', 'hospital'], ARRAY['health equipment', 'clinical supplies']),

-- Laboratory Equipment
('41', 'Laboratory and Measuring and Observing and Testing Equipment', 'Lab and testing equipment', 1, NULL, ARRAY['laboratory', 'testing', 'measuring', 'scientific'], ARRAY['lab equipment', 'instruments']),

-- Furniture
('56', 'Furniture and Furnishings', 'Furniture and interior items', 1, NULL, ARRAY['furniture', 'furnishings', 'interior', 'décor'], ARRAY['furnishing', 'fixtures']),

-- Cleaning
('47', 'Cleaning Equipment and Supplies', 'Cleaning products and equipment', 1, NULL, ARRAY['cleaning', 'janitorial', 'sanitation', 'hygiene'], ARRAY['sanitary', 'janitorial supplies']),

-- Professional Services
('80', 'Management and Business Professionals and Administrative Services', 'Business and professional services', 1, NULL, ARRAY['consulting', 'management', 'professional services', 'business services'], ARRAY['consultancy', 'advisory']),

-- Financial Services
('84', 'Financial and Insurance Services', 'Banking and insurance services', 1, NULL, ARRAY['financial', 'banking', 'insurance', 'finance'], ARRAY['banking services', 'insurance services']),

-- Healthcare Services
('85', 'Healthcare Services', 'Medical and health services', 1, NULL, ARRAY['healthcare', 'medical services', 'health', 'clinical services'], ARRAY['medical care', 'health services']),

-- Education Services
('86', 'Education and Training Services', 'Educational and training services', 1, NULL, ARRAY['education', 'training', 'learning', 'development'], ARRAY['schooling', 'instruction']),

-- Travel and Lodging
('90', 'Travel and Food and Lodging and Entertainment Services', 'Travel and hospitality services', 1, NULL, ARRAY['travel', 'lodging', 'hotels', 'entertainment'], ARRAY['hospitality', 'accommodation']),

-- Transportation Services
('78', 'Transportation and Storage and Mail Services', 'Logistics and transportation services', 1, NULL, ARRAY['transportation', 'logistics', 'shipping', 'storage'], ARRAY['freight', 'delivery']),

-- Utilities
('83', 'Public Utilities and Public Sector Related Services', 'Utility services', 1, NULL, ARRAY['utilities', 'power', 'water', 'gas'], ARRAY['public services', 'infrastructure']),

-- Legal Services
('93', 'Politics and Civic Affairs Services', 'Legal and civic services', 1, NULL, ARRAY['legal', 'government', 'civic', 'public affairs'], ARRAY['legal services', 'government services']),

-- Engineering Services
('81', 'Engineering and Research and Technology Based Services', 'Technical and engineering services', 1, NULL, ARRAY['engineering', 'research', 'technology', 'technical'], ARRAY['R&D', 'technical services']);

-- ============================================================================
-- FAMILY LEVEL (Level 2) - 4 digit codes
-- ============================================================================

-- IT Equipment Families
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('4310', 'Computer Equipment and Accessories', 'Computing hardware', 2, '43', ARRAY['computers', 'hardware', 'PC', 'laptop', 'server'], ARRAY['computing equipment']),
('4311', 'Computer Accessories and Supplies', 'Computer peripherals', 2, '43', ARRAY['peripherals', 'accessories', 'monitors', 'keyboards'], ARRAY['computer parts']),
('4312', 'Data Voice or Multimedia Network Equipment', 'Network infrastructure', 2, '43', ARRAY['networking', 'routers', 'switches', 'infrastructure'], ARRAY['network equipment']),
('4320', 'Software', 'Software products', 2, '43', ARRAY['software', 'applications', 'programs', 'licenses'], ARRAY['apps', 'programs']),
('4322', 'Software Licensing', 'Software licenses', 2, '43', ARRAY['licenses', 'subscriptions', 'SaaS', 'software'], ARRAY['licensing', 'subscriptions']);

-- Professional Services Families
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('8010', 'Management advisory services', 'Consulting services', 2, '80', ARRAY['consulting', 'advisory', 'management', 'strategy'], ARRAY['consultancy']),
('8011', 'Human resources services', 'HR services', 2, '80', ARRAY['HR', 'recruitment', 'staffing', 'payroll'], ARRAY['personnel services']),
('8012', 'Legal services', 'Legal and compliance', 2, '80', ARRAY['legal', 'law', 'compliance', 'contracts'], ARRAY['law services']),
('8013', 'Real estate services', 'Property services', 2, '80', ARRAY['real estate', 'property', 'leasing', 'facilities'], ARRAY['property management']),
('8014', 'Marketing and distribution', 'Marketing services', 2, '80', ARRAY['marketing', 'advertising', 'distribution', 'promotion'], ARRAY['advertising services']),
('8015', 'Trade policy and services', 'Trade and commerce', 2, '80', ARRAY['trade', 'commerce', 'import', 'export'], ARRAY['trade services']),
('8016', 'Business administration services', 'Administrative support', 2, '80', ARRAY['administration', 'business support', 'back office'], ARRAY['admin services']);

-- Financial Services Families
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('8410', 'Development finance', 'Development financing', 2, '84', ARRAY['development', 'financing', 'loans', 'credit'], ARRAY['development lending']),
('8411', 'Accounting and bookkeeping services', 'Financial accounting', 2, '84', ARRAY['accounting', 'bookkeeping', 'audit', 'financial'], ARRAY['accountancy']),
('8412', 'Banking and investment', 'Banking services', 2, '84', ARRAY['banking', 'investment', 'securities', 'trading'], ARRAY['financial services']),
('8413', 'Insurance and retirement services', 'Insurance services', 2, '84', ARRAY['insurance', 'retirement', 'pension', 'benefits'], ARRAY['insurance coverage']);

-- Office Equipment Families
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('4410', 'Printing and publishing equipment', 'Printing equipment', 2, '44', ARRAY['printing', 'printers', 'copiers', 'publishing'], ARRAY['print equipment']),
('4411', 'Audio visual equipment', 'AV equipment', 2, '44', ARRAY['audio', 'visual', 'presentation', 'projectors'], ARRAY['AV']),
('4412', 'Office machines and accessories', 'Office machines', 2, '44', ARRAY['office machines', 'calculators', 'shredders'], ARRAY['office equipment']),
('4420', 'Office supplies', 'General office supplies', 2, '44', ARRAY['supplies', 'stationery', 'paper', 'pens'], ARRAY['stationary']),
('4421', 'Writing instruments', 'Writing supplies', 2, '44', ARRAY['pens', 'pencils', 'markers', 'writing'], ARRAY['writing tools']);

-- ============================================================================
-- CLASS LEVEL (Level 3) - 6 digit codes
-- ============================================================================

-- Software Classes
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('432010', 'Business function specific software', 'Business applications', 3, '4320', ARRAY['ERP', 'CRM', 'business software', 'enterprise'], ARRAY['business apps']),
('432011', 'Finance accounting and enterprise resource planning ERP software', 'ERP and finance software', 3, '4320', ARRAY['ERP', 'accounting', 'finance', 'SAP', 'Oracle'], ARRAY['financial software']),
('432012', 'Computer aided design CAD and computer aided manufacturing CAM software', 'CAD/CAM software', 3, '4320', ARRAY['CAD', 'CAM', 'design', 'engineering'], ARRAY['design software']),
('432013', 'Content authoring and editing software', 'Creative software', 3, '4320', ARRAY['content', 'authoring', 'editing', 'creative'], ARRAY['creative tools']),
('432014', 'Content management software', 'CMS software', 3, '4320', ARRAY['CMS', 'content management', 'web'], ARRAY['content systems']),
('432015', 'Data management and query software', 'Database software', 3, '4320', ARRAY['database', 'SQL', 'data', 'query'], ARRAY['data software']),
('432016', 'Development software', 'Development tools', 3, '4320', ARRAY['development', 'IDE', 'programming', 'coding'], ARRAY['dev tools']),
('432017', 'Educational or reference software', 'Educational software', 3, '4320', ARRAY['education', 'learning', 'training', 'e-learning'], ARRAY['learning software']),
('432018', 'Industry specific software', 'Vertical software', 3, '4320', ARRAY['vertical', 'industry', 'specialized'], ARRAY['specialized software']),
('432019', 'Network applications software', 'Network software', 3, '4320', ARRAY['network', 'communications', 'collaboration'], ARRAY['networking software']),
('432020', 'Network management software', 'Network admin tools', 3, '4320', ARRAY['network management', 'monitoring', 'admin'], ARRAY['network tools']),
('432021', 'Networking software', 'Network connectivity', 3, '4320', ARRAY['networking', 'connectivity', 'protocols'], ARRAY['connectivity software']),
('432022', 'Operating system software', 'Operating systems', 3, '4320', ARRAY['OS', 'operating system', 'Windows', 'Linux'], ARRAY['OS software']),
('432023', 'Security software', 'Security and antivirus', 3, '4320', ARRAY['security', 'antivirus', 'firewall', 'protection'], ARRAY['cybersecurity']);

-- Computer Equipment Classes
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('431010', 'Computer servers', 'Server hardware', 3, '4310', ARRAY['servers', 'rack', 'blade', 'data center'], ARRAY['server equipment']),
('431011', 'Desktop computers', 'Desktop PCs', 3, '4310', ARRAY['desktop', 'PC', 'workstation', 'computer'], ARRAY['desktop machines']),
('431012', 'Notebook computers', 'Laptops', 3, '4310', ARRAY['laptop', 'notebook', 'portable', 'mobile'], ARRAY['laptops']),
('431013', 'Tablet computers', 'Tablets', 3, '4310', ARRAY['tablet', 'iPad', 'mobile', 'touchscreen'], ARRAY['tablets']),
('431014', 'Computer data storage', 'Storage devices', 3, '4310', ARRAY['storage', 'SSD', 'HDD', 'NAS', 'SAN'], ARRAY['data storage']);

-- Consulting Classes
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('801010', 'Strategic planning consultation services', 'Strategy consulting', 3, '8010', ARRAY['strategy', 'planning', 'consulting', 'advisory'], ARRAY['strategic consulting']),
('801011', 'Operations management consultation services', 'Operations consulting', 3, '8010', ARRAY['operations', 'efficiency', 'process', 'optimization'], ARRAY['ops consulting']),
('801012', 'Information technology consultation services', 'IT consulting', 3, '8010', ARRAY['IT', 'technology', 'digital', 'transformation'], ARRAY['tech consulting']),
('801013', 'Business intelligence consulting services', 'BI consulting', 3, '8010', ARRAY['BI', 'analytics', 'data', 'intelligence'], ARRAY['analytics consulting']),
('801014', 'Change management consultation services', 'Change management', 3, '8010', ARRAY['change', 'transformation', 'adoption', 'management'], ARRAY['change consulting']),
('801015', 'Project management consultation services', 'PM consulting', 3, '8010', ARRAY['project', 'management', 'PMO', 'delivery'], ARRAY['PM services']);

-- HR Services Classes
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('801110', 'Temporary personnel services', 'Temp staffing', 3, '8011', ARRAY['temporary', 'staffing', 'temp', 'contract'], ARRAY['temp workers']),
('801111', 'Permanent personnel placement services', 'Recruitment', 3, '8011', ARRAY['recruitment', 'hiring', 'placement', 'headhunting'], ARRAY['recruiting']),
('801112', 'Payroll services', 'Payroll processing', 3, '8011', ARRAY['payroll', 'salary', 'wages', 'compensation'], ARRAY['payroll management']),
('801113', 'Personnel administration services', 'HR admin', 3, '8011', ARRAY['HR', 'administration', 'personnel', 'employee'], ARRAY['HR admin']),
('801114', 'Training and development services', 'Corporate training', 3, '8011', ARRAY['training', 'development', 'learning', 'skills'], ARRAY['L&D']);

-- ============================================================================
-- COMMODITY LEVEL (Level 4) - 8 digit codes
-- ============================================================================

-- Cloud Software Commodities
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('43201001', 'Customer relationship management CRM software', 'CRM systems', 4, '432010', ARRAY['CRM', 'Salesforce', 'customer', 'sales'], ARRAY['CRM software']),
('43201002', 'Enterprise resource planning ERP software', 'ERP systems', 4, '432010', ARRAY['ERP', 'SAP', 'Oracle', 'enterprise'], ARRAY['ERP systems']),
('43201003', 'Supply chain management software', 'SCM systems', 4, '432010', ARRAY['SCM', 'supply chain', 'logistics', 'procurement'], ARRAY['SCM software']),
('43201004', 'Human capital management software', 'HCM systems', 4, '432010', ARRAY['HCM', 'HR', 'workforce', 'Workday'], ARRAY['HR software']),
('43201005', 'Business intelligence software', 'BI tools', 4, '432010', ARRAY['BI', 'analytics', 'reporting', 'Tableau'], ARRAY['analytics tools']),
('43201006', 'Project management software', 'PM tools', 4, '432010', ARRAY['project', 'management', 'Asana', 'Jira'], ARRAY['PM software']),
('43201007', 'Collaboration software', 'Collaboration tools', 4, '432010', ARRAY['collaboration', 'Slack', 'Teams', 'communication'], ARRAY['team tools']),
('43201008', 'Marketing automation software', 'Marketing tools', 4, '432010', ARRAY['marketing', 'automation', 'HubSpot', 'Marketo'], ARRAY['marketing software']);

-- Cloud Infrastructure Commodities
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('43220101', 'Infrastructure as a Service IaaS', 'Cloud infrastructure', 4, '4322', ARRAY['IaaS', 'AWS', 'Azure', 'cloud', 'infrastructure'], ARRAY['cloud hosting']),
('43220102', 'Platform as a Service PaaS', 'Cloud platforms', 4, '4322', ARRAY['PaaS', 'Heroku', 'platform', 'development'], ARRAY['cloud platform']),
('43220103', 'Software as a Service SaaS subscriptions', 'SaaS subscriptions', 4, '4322', ARRAY['SaaS', 'subscription', 'cloud', 'software'], ARRAY['cloud software']),
('43220104', 'Cloud storage services', 'Cloud storage', 4, '4322', ARRAY['storage', 'cloud', 'S3', 'backup'], ARRAY['online storage']),
('43220105', 'Content delivery network services', 'CDN services', 4, '4322', ARRAY['CDN', 'content', 'delivery', 'caching'], ARRAY['CDN']),
('43220106', 'Database as a Service', 'Cloud databases', 4, '4322', ARRAY['database', 'DaaS', 'RDS', 'cloud'], ARRAY['managed database']);

-- Security Software Commodities
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('43202301', 'Antivirus software', 'Antivirus protection', 4, '432023', ARRAY['antivirus', 'malware', 'protection', 'security'], ARRAY['virus protection']),
('43202302', 'Firewall software', 'Firewall solutions', 4, '432023', ARRAY['firewall', 'network security', 'protection'], ARRAY['network firewall']),
('43202303', 'Endpoint protection software', 'Endpoint security', 4, '432023', ARRAY['endpoint', 'EDR', 'protection', 'security'], ARRAY['endpoint security']),
('43202304', 'Identity and access management software', 'IAM solutions', 4, '432023', ARRAY['IAM', 'identity', 'access', 'SSO', 'authentication'], ARRAY['identity management']),
('43202305', 'Data loss prevention software', 'DLP solutions', 4, '432023', ARRAY['DLP', 'data loss', 'prevention', 'security'], ARRAY['data protection']),
('43202306', 'Security information and event management software', 'SIEM systems', 4, '432023', ARRAY['SIEM', 'logging', 'monitoring', 'security'], ARRAY['security monitoring']);

-- IT Consulting Commodities
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('80101201', 'Cloud migration services', 'Cloud consulting', 4, '801012', ARRAY['cloud', 'migration', 'AWS', 'Azure', 'transformation'], ARRAY['cloud services']),
('80101202', 'Cybersecurity consulting services', 'Security consulting', 4, '801012', ARRAY['cybersecurity', 'security', 'risk', 'audit'], ARRAY['security services']),
('80101203', 'Data analytics consulting services', 'Analytics consulting', 4, '801012', ARRAY['analytics', 'data', 'insights', 'BI'], ARRAY['data services']),
('80101204', 'Digital transformation consulting services', 'Digital consulting', 4, '801012', ARRAY['digital', 'transformation', 'innovation', 'technology'], ARRAY['digital services']),
('80101205', 'Software development consulting services', 'Dev consulting', 4, '801012', ARRAY['development', 'software', 'custom', 'application'], ARRAY['dev services']),
('80101206', 'IT infrastructure consulting services', 'Infrastructure consulting', 4, '801012', ARRAY['infrastructure', 'network', 'systems', 'architecture'], ARRAY['infra services']),
('80101207', 'Enterprise architecture consulting services', 'EA consulting', 4, '801012', ARRAY['architecture', 'enterprise', 'design', 'strategy'], ARRAY['EA services']);

-- Staffing Commodities
INSERT INTO product_service_taxonomy (code, name, description, level, parent_code, keywords, synonyms) VALUES
('80111001', 'IT temporary staffing services', 'IT contractors', 4, '801110', ARRAY['IT', 'contractor', 'temporary', 'developer'], ARRAY['IT temps']),
('80111002', 'Administrative temporary staffing services', 'Admin temps', 4, '801110', ARRAY['administrative', 'office', 'temporary', 'support'], ARRAY['office temps']),
('80111003', 'Professional temporary staffing services', 'Professional temps', 4, '801110', ARRAY['professional', 'consultant', 'temporary', 'expert'], ARRAY['contract professionals']),
('80111101', 'Executive search services', 'Executive recruitment', 4, '801111', ARRAY['executive', 'search', 'leadership', 'C-level'], ARRAY['exec search']),
('80111102', 'Technical recruitment services', 'Tech recruiting', 4, '801111', ARRAY['technical', 'engineering', 'developer', 'IT'], ARRAY['tech hiring']),
('80111103', 'Sales recruitment services', 'Sales recruiting', 4, '801111', ARRAY['sales', 'business development', 'account'], ARRAY['sales hiring']);

-- Now create the full-text search index
SELECT create_taxonomy_search_index();

-- Update the search vectors
UPDATE product_service_taxonomy
SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(array_to_string(keywords, ' '), '') || ' ' ||
  coalesce(array_to_string(synonyms, ' '), '')
);

-- Verify counts
DO $$
DECLARE
  segment_count INTEGER;
  family_count INTEGER;
  class_count INTEGER;
  commodity_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO segment_count FROM product_service_taxonomy WHERE level = 1;
  SELECT COUNT(*) INTO family_count FROM product_service_taxonomy WHERE level = 2;
  SELECT COUNT(*) INTO class_count FROM product_service_taxonomy WHERE level = 3;
  SELECT COUNT(*) INTO commodity_count FROM product_service_taxonomy WHERE level = 4;
  SELECT COUNT(*) INTO total_count FROM product_service_taxonomy;

  RAISE NOTICE 'UNSPSC Taxonomy Seed Complete:';
  RAISE NOTICE '  Segments (L1): %', segment_count;
  RAISE NOTICE '  Families (L2): %', family_count;
  RAISE NOTICE '  Classes (L3): %', class_count;
  RAISE NOTICE '  Commodities (L4): %', commodity_count;
  RAISE NOTICE '  Total Codes: %', total_count;
END $$;
