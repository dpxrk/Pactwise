-- ================================================================
-- PACTWISE ORGANIZATION COMPREHENSIVE SEED DATA
-- ================================================================
-- This script creates comprehensive seed data for Pactwise Organization
-- including vendors, contracts, budgets, and related entities
-- ================================================================

-- Set the enterprise_id for Pactwise Organization
DO $$
DECLARE
    v_enterprise_id UUID := '7328ef75-2d46-4892-8562-20e450343cbd';
    v_user_id UUID;
    v_vendor_id UUID;
    v_contract_id UUID;
    v_budget_id UUID;
    v_category_id UUID;
BEGIN
    -- Get the owner user ID
    SELECT id INTO v_user_id FROM users 
    WHERE enterprise_id = v_enterprise_id AND role = 'owner' 
    LIMIT 1;

    -- ================================================================
    -- CREATE ADDITIONAL TEAM MEMBERS
    -- ================================================================
    
    -- Add team members if they don't exist
    INSERT INTO users (email, auth_id, role, enterprise_id, department, title, first_name, last_name, created_at)
    SELECT * FROM (VALUES
        ('john.doe@pactwise.com', gen_random_uuid(), 'admin', v_enterprise_id, 'Operations', 'COO', 'John', 'Doe', NOW()),
        ('sarah.smith@pactwise.com', gen_random_uuid(), 'manager', v_enterprise_id, 'Finance', 'CFO', 'Sarah', 'Smith', NOW()),
        ('mike.johnson@pactwise.com', gen_random_uuid(), 'manager', v_enterprise_id, 'Legal', 'Head of Legal', 'Mike', 'Johnson', NOW()),
        ('emily.chen@pactwise.com', gen_random_uuid(), 'user', v_enterprise_id, 'IT', 'IT Manager', 'Emily', 'Chen', NOW()),
        ('david.wilson@pactwise.com', gen_random_uuid(), 'user', v_enterprise_id, 'HR', 'HR Manager', 'David', 'Wilson', NOW()),
        ('lisa.brown@pactwise.com', gen_random_uuid(), 'user', v_enterprise_id, 'Marketing', 'Marketing Manager', 'Lisa', 'Brown', NOW()),
        ('alex.davis@pactwise.com', gen_random_uuid(), 'viewer', v_enterprise_id, 'Sales', 'Sales Analyst', 'Alex', 'Davis', NOW())
    ) AS v(email, auth_id, role, enterprise_id, department, title, first_name, last_name, created_at)
    WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE email = v.email
    );

    -- ================================================================
    -- CREATE VENDOR CATEGORIES
    -- ================================================================
    
    INSERT INTO vendor_categories (id, enterprise_id, name, description, risk_weight, compliance_requirements, created_at)
    VALUES
        (gen_random_uuid(), v_enterprise_id, 'Software & SaaS', 'Software licenses and SaaS subscriptions', 0.7, 
         '{"soc2": true, "gdpr": true, "security_audit": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Cloud Infrastructure', 'Cloud services and infrastructure providers', 0.8,
         '{"iso27001": true, "soc2": true, "uptime_sla": "99.9%"}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Professional Services', 'Consulting and professional services', 0.5,
         '{"insurance": true, "nda": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Marketing & Advertising', 'Marketing tools and advertising platforms', 0.4,
         '{"privacy_policy": true, "data_retention": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'HR & Benefits', 'HR services and employee benefits', 0.6,
         '{"compliance": true, "data_security": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Security & Compliance', 'Security tools and compliance services', 0.9,
         '{"soc2": true, "iso27001": true, "pen_testing": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Development Tools', 'Development and DevOps tools', 0.6,
         '{"sla": true, "support": "24/7"}'::jsonb, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Office & Facilities', 'Office supplies and facilities management', 0.3,
         '{"insurance": true}'::jsonb, NOW())
    ON CONFLICT DO NOTHING;

    -- ================================================================
    -- CREATE VENDORS
    -- ================================================================
    
    -- Software & SaaS Vendors
    INSERT INTO vendors (id, enterprise_id, name, category, status, description, website, 
                        primary_contact_name, primary_contact_email, primary_contact_phone,
                        risk_score, payment_terms, currency, tax_rate,
                        vendor_type, service_type, total_spend, performance_rating,
                        compliance_status, contract_count, created_at)
    VALUES
        -- Software & SaaS
        (gen_random_uuid(), v_enterprise_id, 'Microsoft Corporation', 'Software & SaaS', 'active',
         'Enterprise software and cloud services', 'https://microsoft.com',
         'Account Manager', 'enterprise@microsoft.com', '+1-800-642-7676',
         15, 'Net 30', 'USD', 8.25,
         'strategic', 'subscription', 250000, 4.5,
         'compliant', 3, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Salesforce', 'Software & SaaS', 'active',
         'CRM and enterprise cloud solutions', 'https://salesforce.com',
         'Sarah Johnson', 'sjohnson@salesforce.com', '+1-800-667-6389',
         12, 'Net 30', 'USD', 8.25,
         'strategic', 'subscription', 180000, 4.3,
         'compliant', 2, NOW() - INTERVAL '18 months'),
         
        (gen_random_uuid(), v_enterprise_id, 'Slack Technologies', 'Software & SaaS', 'active',
         'Team collaboration and communication', 'https://slack.com',
         'Mike Chen', 'mchen@slack.com', '+1-800-390-8984',
         10, 'Monthly', 'USD', 8.25,
         'preferred', 'subscription', 45000, 4.6,
         'compliant', 1, NOW() - INTERVAL '3 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Zoom Video Communications', 'Software & SaaS', 'active',
         'Video conferencing and communication', 'https://zoom.us',
         'Lisa Park', 'lpark@zoom.us', '+1-888-799-9666',
         8, 'Annual', 'USD', 8.25,
         'preferred', 'subscription', 25000, 4.4,
         'compliant', 1, NOW() - INTERVAL '4 years'),

        -- Cloud Infrastructure
        (gen_random_uuid(), v_enterprise_id, 'Amazon Web Services', 'Cloud Infrastructure', 'active',
         'Cloud computing and infrastructure', 'https://aws.amazon.com',
         'AWS Support', 'enterprise-support@aws.amazon.com', '+1-800-AWS-0000',
         10, 'Monthly', 'USD', 8.25,
         'strategic', 'usage-based', 320000, 4.7,
         'compliant', 2, NOW() - INTERVAL '3 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Google Cloud Platform', 'Cloud Infrastructure', 'active',
         'Cloud services and machine learning', 'https://cloud.google.com',
         'GCP Sales', 'sales@google.com', '+1-855-355-5222',
         12, 'Monthly', 'USD', 8.25,
         'preferred', 'usage-based', 85000, 4.5,
         'compliant', 1, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Cloudflare', 'Cloud Infrastructure', 'active',
         'CDN and DDoS protection', 'https://cloudflare.com',
         'Enterprise Team', 'enterprise@cloudflare.com', '+1-650-319-8930',
         8, 'Annual', 'USD', 8.25,
         'preferred', 'subscription', 36000, 4.8,
         'compliant', 1, NOW() - INTERVAL '1 year'),

        -- Professional Services
        (gen_random_uuid(), v_enterprise_id, 'Deloitte', 'Professional Services', 'active',
         'Consulting and professional services', 'https://deloitte.com',
         'James Wilson', 'jwilson@deloitte.com', '+1-800-335-6488',
         15, 'Net 45', 'USD', 8.25,
         'strategic', 'project-based', 450000, 4.2,
         'compliant', 2, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'McKinsey & Company', 'Professional Services', 'active',
         'Management consulting', 'https://mckinsey.com',
         'Robert Chen', 'rchen@mckinsey.com', '+1-800-625-4673',
         12, 'Net 45', 'USD', 8.25,
         'preferred', 'project-based', 280000, 4.4,
         'compliant', 1, NOW() - INTERVAL '1 year'),

        -- Marketing & Advertising
        (gen_random_uuid(), v_enterprise_id, 'HubSpot', 'Marketing & Advertising', 'active',
         'Marketing automation and CRM', 'https://hubspot.com',
         'Amanda Davis', 'adavis@hubspot.com', '+1-888-482-7768',
         10, 'Annual', 'USD', 8.25,
         'preferred', 'subscription', 60000, 4.5,
         'compliant', 1, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Google Ads', 'Marketing & Advertising', 'active',
         'Online advertising platform', 'https://ads.google.com',
         'Google Ads Team', 'support@google.com', '+1-866-246-6453',
         8, 'Monthly', 'USD', 8.25,
         'standard', 'usage-based', 120000, 4.3,
         'compliant', 1, NOW() - INTERVAL '3 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Mailchimp', 'Marketing & Advertising', 'active',
         'Email marketing platform', 'https://mailchimp.com',
         'Support Team', 'support@mailchimp.com', '+1-800-315-5939',
         6, 'Monthly', 'USD', 8.25,
         'standard', 'subscription', 18000, 4.4,
         'compliant', 1, NOW() - INTERVAL '2 years'),

        -- HR & Benefits
        (gen_random_uuid(), v_enterprise_id, 'ADP', 'HR & Benefits', 'active',
         'Payroll and HR services', 'https://adp.com',
         'Michelle Brown', 'mbrown@adp.com', '+1-800-225-5237',
         12, 'Monthly', 'USD', 8.25,
         'strategic', 'subscription', 95000, 4.3,
         'compliant', 1, NOW() - INTERVAL '4 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Workday', 'HR & Benefits', 'active',
         'HR and finance management', 'https://workday.com',
         'David Lee', 'dlee@workday.com', '+1-877-967-5329',
         15, 'Annual', 'USD', 8.25,
         'strategic', 'subscription', 120000, 4.5,
         'compliant', 1, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'BambooHR', 'HR & Benefits', 'active',
         'HR software for small and medium businesses', 'https://bamboohr.com',
         'Support Team', 'support@bamboohr.com', '+1-866-387-9595',
         8, 'Annual', 'USD', 8.25,
         'preferred', 'subscription', 24000, 4.6,
         'compliant', 1, NOW() - INTERVAL '1 year'),

        -- Security & Compliance
        (gen_random_uuid(), v_enterprise_id, 'CrowdStrike', 'Security & Compliance', 'active',
         'Endpoint security and threat intelligence', 'https://crowdstrike.com',
         'Security Team', 'sales@crowdstrike.com', '+1-888-512-8906',
         18, 'Annual', 'USD', 8.25,
         'strategic', 'subscription', 85000, 4.7,
         'compliant', 1, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Okta', 'Security & Compliance', 'active',
         'Identity and access management', 'https://okta.com',
         'John Smith', 'jsmith@okta.com', '+1-800-219-0964',
         15, 'Annual', 'USD', 8.25,
         'strategic', 'subscription', 65000, 4.6,
         'compliant', 1, NOW() - INTERVAL '3 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Datadog', 'Security & Compliance', 'active',
         'Monitoring and security platform', 'https://datadoghq.com',
         'Technical Account', 'support@datadoghq.com', '+1-866-329-4466',
         12, 'Monthly', 'USD', 8.25,
         'preferred', 'usage-based', 48000, 4.5,
         'compliant', 1, NOW() - INTERVAL '2 years'),

        -- Development Tools
        (gen_random_uuid(), v_enterprise_id, 'GitHub', 'Development Tools', 'active',
         'Code hosting and collaboration', 'https://github.com',
         'Enterprise Support', 'enterprise@github.com', '+1-877-448-4820',
         8, 'Annual', 'USD', 8.25,
         'strategic', 'subscription', 36000, 4.8,
         'compliant', 1, NOW() - INTERVAL '4 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'JetBrains', 'Development Tools', 'active',
         'Development tools and IDEs', 'https://jetbrains.com',
         'Sales Team', 'sales@jetbrains.com', '+1-888-672-3316',
         6, 'Annual', 'USD', 8.25,
         'preferred', 'subscription', 15000, 4.7,
         'compliant', 1, NOW() - INTERVAL '3 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Atlassian', 'Development Tools', 'active',
         'Development and collaboration tools', 'https://atlassian.com',
         'Account Manager', 'enterprise@atlassian.com', '+1-415-701-1110',
         10, 'Annual', 'USD', 8.25,
         'strategic', 'subscription', 42000, 4.5,
         'compliant', 2, NOW() - INTERVAL '3 years'),

        -- Office & Facilities
        (gen_random_uuid(), v_enterprise_id, 'WeWork', 'Office & Facilities', 'active',
         'Flexible office spaces', 'https://wework.com',
         'Space Manager', 'enterprise@wework.com', '+1-646-491-9060',
         15, 'Monthly', 'USD', 8.25,
         'preferred', 'subscription', 180000, 4.0,
         'compliant', 1, NOW() - INTERVAL '2 years'),
         
        (gen_random_uuid(), v_enterprise_id, 'Staples Business', 'Office & Facilities', 'active',
         'Office supplies and services', 'https://staples.com',
         'Business Account', 'business@staples.com', '+1-877-826-7755',
         5, 'Net 30', 'USD', 8.25,
         'standard', 'purchase-order', 24000, 4.2,
         'compliant', 1, NOW() - INTERVAL '3 years');

    -- ================================================================
    -- CREATE CONTRACTS
    -- ================================================================
    
    -- Create contracts for major vendors
    INSERT INTO contracts (id, enterprise_id, vendor_id, contract_name, contract_type, 
                          status, start_date, end_date, total_value, payment_terms,
                          auto_renew, renewal_notice_days, description, 
                          compliance_status, risk_score, created_by, created_at)
    SELECT 
        gen_random_uuid(),
        v.enterprise_id,
        v.id,
        v.name || ' - ' || 
        CASE 
            WHEN v.service_type = 'subscription' THEN 'Annual Subscription'
            WHEN v.service_type = 'usage-based' THEN 'Usage Agreement'
            WHEN v.service_type = 'project-based' THEN 'Professional Services Agreement'
            ELSE 'Service Agreement'
        END,
        CASE 
            WHEN v.service_type = 'subscription' THEN 'subscription'
            WHEN v.service_type = 'project-based' THEN 'professional_services'
            WHEN v.name LIKE '%AWS%' OR v.name LIKE '%Google Cloud%' THEN 'master_agreement'
            ELSE 'service_agreement'
        END,
        CASE 
            WHEN v.name IN ('Microsoft Corporation', 'Salesforce', 'Amazon Web Services', 'Deloitte') THEN 'active'
            WHEN random() < 0.8 THEN 'active'
            ELSE 'pending_renewal'
        END,
        CASE 
            WHEN v.name = 'Microsoft Corporation' THEN NOW() - INTERVAL '11 months'
            WHEN v.name = 'Salesforce' THEN NOW() - INTERVAL '8 months'
            WHEN v.name = 'Amazon Web Services' THEN NOW() - INTERVAL '10 months'
            WHEN random() < 0.3 THEN NOW() - INTERVAL '2 months'
            WHEN random() < 0.6 THEN NOW() - INTERVAL '6 months'
            ELSE NOW() - INTERVAL '10 months'
        END,
        CASE 
            WHEN v.name = 'Microsoft Corporation' THEN NOW() + INTERVAL '1 month'
            WHEN v.name = 'Salesforce' THEN NOW() + INTERVAL '4 months'
            WHEN v.name = 'Amazon Web Services' THEN NOW() + INTERVAL '2 months'
            WHEN random() < 0.3 THEN NOW() + INTERVAL '10 months'
            WHEN random() < 0.6 THEN NOW() + INTERVAL '6 months'
            ELSE NOW() + INTERVAL '2 months'
        END,
        v.total_spend,
        v.payment_terms,
        v.service_type = 'subscription',
        CASE 
            WHEN v.vendor_type = 'strategic' THEN 90
            WHEN v.vendor_type = 'preferred' THEN 60
            ELSE 30
        END,
        CASE 
            WHEN v.category = 'Software & SaaS' THEN 'Enterprise software licensing and support services'
            WHEN v.category = 'Cloud Infrastructure' THEN 'Cloud computing resources and infrastructure services'
            WHEN v.category = 'Professional Services' THEN 'Consulting and professional advisory services'
            WHEN v.category = 'Marketing & Advertising' THEN 'Marketing platform and advertising services'
            WHEN v.category = 'HR & Benefits' THEN 'Human resources management and benefits administration'
            WHEN v.category = 'Security & Compliance' THEN 'Security tools and compliance management services'
            WHEN v.category = 'Development Tools' THEN 'Software development tools and collaboration platforms'
            ELSE 'Business services and support'
        END,
        'compliant',
        v.risk_score,
        v_user_id,
        v.created_at + INTERVAL '7 days'
    FROM vendors v
    WHERE v.enterprise_id = v_enterprise_id;

    -- ================================================================
    -- CREATE BUDGETS
    -- ================================================================
    
    INSERT INTO budgets (id, enterprise_id, name, budget_type, amount, fiscal_year, 
                        fiscal_quarter, department, status, allocated, spent, committed,
                        owner_id, created_at)
    VALUES
        (gen_random_uuid(), v_enterprise_id, 'IT Infrastructure', 'departmental', 
         1200000, 2024, NULL, 'IT', 'active', 1000000, 650000, 200000, v_user_id, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Software & Tools', 'category', 
         800000, 2024, NULL, 'Technology', 'active', 750000, 420000, 180000, v_user_id, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Professional Services', 'departmental', 
         600000, 2024, NULL, 'Operations', 'active', 500000, 380000, 100000, v_user_id, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Marketing & Sales', 'departmental', 
         400000, 2024, NULL, 'Marketing', 'active', 350000, 220000, 80000, v_user_id, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'HR & Benefits', 'departmental', 
         300000, 2024, NULL, 'HR', 'active', 280000, 195000, 60000, v_user_id, NOW()),
        (gen_random_uuid(), v_enterprise_id, 'Q1 2024 Budget', 'quarterly', 
         750000, 2024, 1, NULL, 'closed', 750000, 720000, 0, v_user_id, NOW() - INTERVAL '6 months'),
        (gen_random_uuid(), v_enterprise_id, 'Q2 2024 Budget', 'quarterly', 
         800000, 2024, 2, NULL, 'closed', 800000, 785000, 0, v_user_id, NOW() - INTERVAL '3 months'),
        (gen_random_uuid(), v_enterprise_id, 'Q3 2024 Budget', 'quarterly', 
         850000, 2024, 3, NULL, 'active', 850000, 450000, 200000, v_user_id, NOW());

    -- ================================================================
    -- CREATE CONTRACT DOCUMENTS
    -- ================================================================
    
    INSERT INTO contract_documents (id, contract_id, document_name, document_type, 
                                   file_path, file_size, uploaded_by, created_at)
    SELECT 
        gen_random_uuid(),
        c.id,
        c.contract_name || ' - Signed Agreement.pdf',
        'signed_contract',
        '/documents/contracts/' || c.id || '/agreement.pdf',
        floor(random() * 1000000 + 100000)::bigint,
        v_user_id,
        c.created_at + INTERVAL '1 day'
    FROM contracts c
    WHERE c.enterprise_id = v_enterprise_id
    AND c.status = 'active';

    -- Add SOWs for professional services contracts
    INSERT INTO contract_documents (id, contract_id, document_name, document_type, 
                                   file_path, file_size, uploaded_by, created_at)
    SELECT 
        gen_random_uuid(),
        c.id,
        'Statement of Work - ' || to_char(c.created_at, 'YYYY-MM') || '.pdf',
        'sow',
        '/documents/contracts/' || c.id || '/sow.pdf',
        floor(random() * 500000 + 50000)::bigint,
        v_user_id,
        c.created_at + INTERVAL '2 days'
    FROM contracts c
    WHERE c.enterprise_id = v_enterprise_id
    AND c.contract_type = 'professional_services';

    -- ================================================================
    -- CREATE CONTRACT MILESTONES
    -- ================================================================
    
    INSERT INTO contract_milestones (id, contract_id, milestone_name, due_date, 
                                    amount, status, description, created_at)
    SELECT 
        gen_random_uuid(),
        c.id,
        'Q' || quarter || ' ' || year || ' Payment',
        make_date(year::int, (quarter::int - 1) * 3 + 1, 1),
        c.total_value / 4,
        CASE 
            WHEN make_date(year::int, (quarter::int - 1) * 3 + 1, 1) < NOW() THEN 'completed'
            WHEN make_date(year::int, (quarter::int - 1) * 3 + 1, 1) < NOW() + INTERVAL '30 days' THEN 'pending'
            ELSE 'upcoming'
        END,
        'Quarterly payment milestone',
        c.created_at
    FROM contracts c,
         generate_series(1, 4) AS quarter,
         generate_series(extract(year from NOW())::int, extract(year from NOW())::int) AS year
    WHERE c.enterprise_id = v_enterprise_id
    AND c.payment_terms IN ('Quarterly', 'Net 30', 'Net 45')
    AND c.status = 'active';

    -- ================================================================
    -- CREATE VENDOR PERFORMANCE METRICS
    -- ================================================================
    
    INSERT INTO vendor_performance_metrics (id, vendor_id, metric_date, metric_type,
                                           metric_value, target_value, created_at)
    SELECT 
        gen_random_uuid(),
        v.id,
        date_trunc('month', NOW() - (month || ' months')::interval),
        metric_type,
        CASE 
            WHEN metric_type = 'on_time_delivery' THEN 85 + random() * 15
            WHEN metric_type = 'quality_score' THEN 80 + random() * 20
            WHEN metric_type = 'response_time' THEN 2 + random() * 8
            WHEN metric_type = 'cost_savings' THEN random() * 10
            WHEN metric_type = 'compliance_score' THEN 90 + random() * 10
        END,
        CASE 
            WHEN metric_type = 'on_time_delivery' THEN 95
            WHEN metric_type = 'quality_score' THEN 90
            WHEN metric_type = 'response_time' THEN 4
            WHEN metric_type = 'cost_savings' THEN 5
            WHEN metric_type = 'compliance_score' THEN 95
        END,
        NOW() - (month || ' months')::interval
    FROM vendors v,
         generate_series(0, 11) AS month,
         unnest(ARRAY['on_time_delivery', 'quality_score', 'response_time', 'cost_savings', 'compliance_score']) AS metric_type
    WHERE v.enterprise_id = v_enterprise_id
    AND v.vendor_type IN ('strategic', 'preferred');

    -- ================================================================
    -- CREATE VENDOR CONTACTS
    -- ================================================================
    
    INSERT INTO vendor_contacts (id, vendor_id, contact_name, contact_email, 
                                contact_phone, contact_role, is_primary, created_at)
    SELECT 
        gen_random_uuid(),
        v.id,
        v.primary_contact_name,
        v.primary_contact_email,
        v.primary_contact_phone,
        'Account Manager',
        true,
        v.created_at
    FROM vendors v
    WHERE v.enterprise_id = v_enterprise_id;

    -- Add secondary contacts for strategic vendors
    INSERT INTO vendor_contacts (id, vendor_id, contact_name, contact_email, 
                                contact_phone, contact_role, is_primary, created_at)
    SELECT 
        gen_random_uuid(),
        v.id,
        'Technical Support',
        'support@' || lower(replace(v.name, ' ', '')) || '.com',
        '+1-800-SUPPORT',
        'Technical Support',
        false,
        v.created_at
    FROM vendors v
    WHERE v.enterprise_id = v_enterprise_id
    AND v.vendor_type = 'strategic';

    -- ================================================================
    -- CREATE COMPLIANCE RECORDS
    -- ================================================================
    
    INSERT INTO vendor_compliance_records (id, vendor_id, compliance_type, 
                                          compliance_status, expiry_date, 
                                          last_verified, notes, created_at)
    SELECT 
        gen_random_uuid(),
        v.id,
        compliance_type,
        'compliant',
        NOW() + INTERVAL '1 year',
        NOW() - INTERVAL '1 month',
        'Compliance verified and up to date',
        NOW() - INTERVAL '1 month'
    FROM vendors v,
         unnest(ARRAY['SOC2', 'ISO27001', 'GDPR', 'Insurance Certificate']) AS compliance_type
    WHERE v.enterprise_id = v_enterprise_id
    AND v.vendor_type IN ('strategic', 'preferred')
    AND (
        (compliance_type = 'SOC2' AND v.category IN ('Software & SaaS', 'Cloud Infrastructure', 'Security & Compliance'))
        OR (compliance_type = 'ISO27001' AND v.category IN ('Cloud Infrastructure', 'Security & Compliance'))
        OR (compliance_type = 'GDPR' AND v.category IN ('Software & SaaS', 'HR & Benefits', 'Marketing & Advertising'))
        OR (compliance_type = 'Insurance Certificate')
    );

    -- ================================================================
    -- CREATE SPEND ANALYTICS
    -- ================================================================
    
    INSERT INTO spend_analytics (id, enterprise_id, vendor_id, category, 
                                department, period_start, period_end, 
                                amount, budget_id, created_at)
    SELECT 
        gen_random_uuid(),
        v.enterprise_id,
        v.id,
        v.category,
        CASE 
            WHEN v.category IN ('Software & SaaS', 'Cloud Infrastructure', 'Development Tools') THEN 'IT'
            WHEN v.category = 'Professional Services' THEN 'Operations'
            WHEN v.category = 'Marketing & Advertising' THEN 'Marketing'
            WHEN v.category = 'HR & Benefits' THEN 'HR'
            WHEN v.category = 'Security & Compliance' THEN 'IT'
            ELSE 'Operations'
        END,
        date_trunc('month', NOW() - (month || ' months')::interval),
        date_trunc('month', NOW() - (month || ' months')::interval) + INTERVAL '1 month' - INTERVAL '1 day',
        (v.total_spend / 12) * (0.8 + random() * 0.4),
        NULL,
        NOW() - (month || ' months')::interval
    FROM vendors v,
         generate_series(0, 11) AS month
    WHERE v.enterprise_id = v_enterprise_id
    AND v.status = 'active';

    -- ================================================================
    -- CREATE NOTIFICATIONS
    -- ================================================================
    
    -- Contract renewal notifications
    INSERT INTO notifications (id, user_id, type, title, message, priority, 
                             related_entity_type, related_entity_id, created_at)
    SELECT 
        gen_random_uuid(),
        v_user_id,
        'contract_renewal',
        'Contract Renewal Required',
        'Contract with ' || v.name || ' expires in ' || 
        EXTRACT(DAY FROM (c.end_date - NOW())) || ' days',
        CASE 
            WHEN c.end_date < NOW() + INTERVAL '30 days' THEN 'high'
            WHEN c.end_date < NOW() + INTERVAL '60 days' THEN 'medium'
            ELSE 'low'
        END,
        'contract',
        c.id,
        NOW()
    FROM contracts c
    JOIN vendors v ON c.vendor_id = v.id
    WHERE c.enterprise_id = v_enterprise_id
    AND c.status = 'active'
    AND c.end_date < NOW() + INTERVAL '90 days';

    -- Budget alerts
    INSERT INTO notifications (id, user_id, type, title, message, priority, 
                             related_entity_type, related_entity_id, created_at)
    SELECT 
        gen_random_uuid(),
        v_user_id,
        'budget_alert',
        'Budget Utilization Alert',
        b.name || ' budget is ' || 
        ROUND((b.spent::numeric / b.amount::numeric) * 100) || '% utilized',
        CASE 
            WHEN (b.spent::numeric / b.amount::numeric) > 0.9 THEN 'high'
            WHEN (b.spent::numeric / b.amount::numeric) > 0.75 THEN 'medium'
            ELSE 'low'
        END,
        'budget',
        b.id,
        NOW()
    FROM budgets b
    WHERE b.enterprise_id = v_enterprise_id
    AND b.status = 'active'
    AND (b.spent::numeric / b.amount::numeric) > 0.75;

    -- ================================================================
    -- CREATE AI ANALYSIS RESULTS (SIMULATED)
    -- ================================================================
    
    -- Add AI contract analysis results
    INSERT INTO ai_analysis_results (id, contract_id, analysis_type, 
                                    risk_score, findings, recommendations, 
                                    confidence_score, created_at)
    SELECT 
        gen_random_uuid(),
        c.id,
        'contract_review',
        floor(random() * 30 + 10)::int,
        jsonb_build_object(
            'key_terms', ARRAY['Payment Terms: ' || c.payment_terms, 'Auto-renewal: ' || c.auto_renew],
            'risks', CASE 
                WHEN c.total_value > 200000 THEN ARRAY['High value contract', 'Strategic vendor dependency']
                WHEN c.end_date < NOW() + INTERVAL '60 days' THEN ARRAY['Upcoming renewal', 'Review terms needed']
                ELSE ARRAY['Standard risk profile']
            END,
            'opportunities', ARRAY['Volume discount available', 'Consolidation opportunity']
        ),
        jsonb_build_object(
            'actions', ARRAY[
                'Review payment terms for optimization',
                'Consider multi-year agreement for better pricing',
                'Evaluate alternative vendors for comparison'
            ]
        ),
        85 + random() * 15,
        c.created_at + INTERVAL '1 hour'
    FROM contracts c
    WHERE c.enterprise_id = v_enterprise_id
    AND c.status = 'active'
    LIMIT 10;

    RAISE NOTICE 'Pactwise seed data created successfully!';
END $$;

-- ================================================================
-- VERIFY DATA CREATION
-- ================================================================

-- Summary of created data
SELECT 'Data Creation Summary' as report;

SELECT 
    'Users' as entity,
    COUNT(*) as count 
FROM users 
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'

UNION ALL

SELECT 
    'Vendors' as entity,
    COUNT(*) as count 
FROM vendors 
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'

UNION ALL

SELECT 
    'Contracts' as entity,
    COUNT(*) as count 
FROM contracts 
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'

UNION ALL

SELECT 
    'Budgets' as entity,
    COUNT(*) as count 
FROM budgets 
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'

UNION ALL

SELECT 
    'Vendor Categories' as entity,
    COUNT(*) as count 
FROM vendor_categories 
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'

ORDER BY entity;

-- Show vendor distribution by category
SELECT 
    category,
    COUNT(*) as vendor_count,
    SUM(total_spend) as total_spend,
    AVG(performance_rating) as avg_rating
FROM vendors
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
GROUP BY category
ORDER BY total_spend DESC;

-- Show contract status distribution
SELECT 
    status,
    COUNT(*) as contract_count,
    SUM(total_value) as total_value
FROM contracts
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
GROUP BY status
ORDER BY contract_count DESC;

-- Show upcoming renewals
SELECT 
    v.name as vendor,
    c.contract_name,
    c.end_date,
    c.total_value,
    EXTRACT(DAY FROM (c.end_date - NOW())) as days_until_expiry
FROM contracts c
JOIN vendors v ON c.vendor_id = v.id
WHERE c.enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
AND c.status = 'active'
AND c.end_date < NOW() + INTERVAL '90 days'
ORDER BY c.end_date;