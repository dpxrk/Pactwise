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
        ('john.doe@pactwise.com', gen_random_uuid(), 'admin'::user_role, v_enterprise_id, 'Operations', 'COO', 'John', 'Doe', NOW()),
        ('sarah.smith@pactwise.com', gen_random_uuid(), 'manager'::user_role, v_enterprise_id, 'Finance', 'CFO', 'Sarah', 'Smith', NOW()),
        ('mike.johnson@pactwise.com', gen_random_uuid(), 'manager'::user_role, v_enterprise_id, 'Legal', 'Head of Legal', 'Mike', 'Johnson', NOW()),
        ('emily.chen@pactwise.com', gen_random_uuid(), 'user'::user_role, v_enterprise_id, 'IT', 'IT Manager', 'Emily', 'Chen', NOW()),
        ('david.wilson@pactwise.com', gen_random_uuid(), 'user'::user_role, v_enterprise_id, 'HR', 'HR Manager', 'David', 'Wilson', NOW()),
        ('lisa.brown@pactwise.com', gen_random_uuid(), 'user'::user_role, v_enterprise_id, 'Marketing', 'Marketing Manager', 'Lisa', 'Brown', NOW()),
        ('alex.davis@pactwise.com', gen_random_uuid(), 'viewer'::user_role, v_enterprise_id, 'Sales', 'Sales Analyst', 'Alex', 'Davis', NOW())
    ) AS v(email, auth_id, role, enterprise_id, department, title, first_name, last_name, created_at)
    WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE email = v.email
    );

    -- ================================================================
    -- CREATE VENDORS
    -- ================================================================
    
    -- Technology Vendors
    INSERT INTO vendors (name, category, status, website, enterprise_id, 
                        performance_score, compliance_score, total_contract_value, 
                        active_contracts, created_by, metadata, created_at)
    VALUES
        ('Microsoft Corporation', 'technology', 'active', 'https://microsoft.com', v_enterprise_id,
         4.5, 4.8, 250000, 3, v_user_id, 
         '{"type": "strategic", "services": ["Azure", "Office 365", "Teams"], "contact": "enterprise@microsoft.com"}'::jsonb, 
         NOW() - INTERVAL '2 years'),
         
        ('Salesforce', 'technology', 'active', 'https://salesforce.com', v_enterprise_id,
         4.3, 4.7, 180000, 2, v_user_id,
         '{"type": "strategic", "services": ["CRM", "Marketing Cloud"], "contact": "sjohnson@salesforce.com"}'::jsonb,
         NOW() - INTERVAL '18 months'),
         
        ('Slack Technologies', 'technology', 'active', 'https://slack.com', v_enterprise_id,
         4.6, 4.5, 45000, 1, v_user_id,
         '{"type": "preferred", "services": ["Communication"], "contact": "mchen@slack.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),
         
        ('Zoom Video Communications', 'technology', 'active', 'https://zoom.us', v_enterprise_id,
         4.4, 4.5, 25000, 1, v_user_id,
         '{"type": "preferred", "services": ["Video Conferencing"], "contact": "lpark@zoom.us"}'::jsonb,
         NOW() - INTERVAL '4 years'),
         
        ('Amazon Web Services', 'technology', 'active', 'https://aws.amazon.com', v_enterprise_id,
         4.7, 4.9, 320000, 2, v_user_id,
         '{"type": "strategic", "services": ["Cloud Infrastructure"], "contact": "enterprise-support@aws.amazon.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),
         
        ('Google Cloud Platform', 'technology', 'active', 'https://cloud.google.com', v_enterprise_id,
         4.5, 4.8, 85000, 1, v_user_id,
         '{"type": "preferred", "services": ["Cloud", "AI/ML"], "contact": "sales@google.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('GitHub', 'technology', 'active', 'https://github.com', v_enterprise_id,
         4.8, 4.6, 36000, 1, v_user_id,
         '{"type": "strategic", "services": ["Code Repository"], "contact": "enterprise@github.com"}'::jsonb,
         NOW() - INTERVAL '4 years'),
         
        ('Atlassian', 'technology', 'active', 'https://atlassian.com', v_enterprise_id,
         4.5, 4.5, 42000, 2, v_user_id,
         '{"type": "strategic", "services": ["Jira", "Confluence"], "contact": "enterprise@atlassian.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),

        -- Consulting Vendors
        ('Deloitte', 'consulting', 'active', 'https://deloitte.com', v_enterprise_id,
         4.2, 4.8, 450000, 2, v_user_id,
         '{"type": "strategic", "services": ["Consulting", "Audit"], "contact": "jwilson@deloitte.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('McKinsey & Company', 'consulting', 'active', 'https://mckinsey.com', v_enterprise_id,
         4.4, 4.7, 280000, 1, v_user_id,
         '{"type": "preferred", "services": ["Management Consulting"], "contact": "rchen@mckinsey.com"}'::jsonb,
         NOW() - INTERVAL '1 year'),
         
        ('Accenture', 'consulting', 'active', 'https://accenture.com', v_enterprise_id,
         4.3, 4.6, 320000, 2, v_user_id,
         '{"type": "strategic", "services": ["Digital Transformation"], "contact": "digital@accenture.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),

        -- Marketing Vendors
        ('HubSpot', 'marketing', 'active', 'https://hubspot.com', v_enterprise_id,
         4.5, 4.5, 60000, 1, v_user_id,
         '{"type": "preferred", "services": ["Marketing Automation"], "contact": "adavis@hubspot.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('Google Ads', 'marketing', 'active', 'https://ads.google.com', v_enterprise_id,
         4.3, 4.4, 120000, 1, v_user_id,
         '{"type": "standard", "services": ["Advertising"], "contact": "support@google.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),
         
        ('Mailchimp', 'marketing', 'active', 'https://mailchimp.com', v_enterprise_id,
         4.4, 4.3, 18000, 1, v_user_id,
         '{"type": "standard", "services": ["Email Marketing"], "contact": "support@mailchimp.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('LinkedIn Marketing', 'marketing', 'active', 'https://business.linkedin.com', v_enterprise_id,
         4.2, 4.4, 48000, 1, v_user_id,
         '{"type": "preferred", "services": ["B2B Marketing"], "contact": "marketing@linkedin.com"}'::jsonb,
         NOW() - INTERVAL '1 year'),

        -- HR Vendors
        ('ADP', 'hr', 'active', 'https://adp.com', v_enterprise_id,
         4.3, 4.7, 95000, 1, v_user_id,
         '{"type": "strategic", "services": ["Payroll", "Benefits"], "contact": "mbrown@adp.com"}'::jsonb,
         NOW() - INTERVAL '4 years'),
         
        ('Workday', 'hr', 'active', 'https://workday.com', v_enterprise_id,
         4.5, 4.8, 120000, 1, v_user_id,
         '{"type": "strategic", "services": ["HRIS", "Finance"], "contact": "dlee@workday.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('BambooHR', 'hr', 'active', 'https://bamboohr.com', v_enterprise_id,
         4.6, 4.5, 24000, 1, v_user_id,
         '{"type": "preferred", "services": ["HR Management"], "contact": "support@bamboohr.com"}'::jsonb,
         NOW() - INTERVAL '1 year'),
         
        ('Indeed', 'hr', 'active', 'https://indeed.com', v_enterprise_id,
         4.1, 4.2, 36000, 1, v_user_id,
         '{"type": "standard", "services": ["Recruiting"], "contact": "business@indeed.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),

        -- Finance Vendors
        ('Ernst & Young', 'finance', 'active', 'https://ey.com', v_enterprise_id,
         4.4, 4.9, 180000, 1, v_user_id,
         '{"type": "strategic", "services": ["Audit", "Tax"], "contact": "audit@ey.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('QuickBooks', 'finance', 'active', 'https://quickbooks.intuit.com', v_enterprise_id,
         4.3, 4.5, 12000, 1, v_user_id,
         '{"type": "standard", "services": ["Accounting"], "contact": "support@quickbooks.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),
         
        ('Stripe', 'finance', 'active', 'https://stripe.com', v_enterprise_id,
         4.7, 4.8, 0, 1, v_user_id,
         '{"type": "preferred", "services": ["Payment Processing"], "contact": "support@stripe.com", "fee_based": true}'::jsonb,
         NOW() - INTERVAL '2 years'),

        -- Legal Vendors
        ('Wilson Sonsini', 'legal', 'active', 'https://wsgr.com', v_enterprise_id,
         4.5, 4.9, 240000, 2, v_user_id,
         '{"type": "strategic", "services": ["Corporate Law"], "contact": "info@wsgr.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),
         
        ('DocuSign', 'legal', 'active', 'https://docusign.com', v_enterprise_id,
         4.6, 4.7, 24000, 1, v_user_id,
         '{"type": "preferred", "services": ["E-Signatures"], "contact": "enterprise@docusign.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),

        -- Facilities Vendors
        ('WeWork', 'facilities', 'active', 'https://wework.com', v_enterprise_id,
         4.0, 4.3, 180000, 1, v_user_id,
         '{"type": "preferred", "services": ["Office Space"], "contact": "enterprise@wework.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),
         
        ('Staples Business', 'facilities', 'active', 'https://staples.com', v_enterprise_id,
         4.2, 4.4, 24000, 1, v_user_id,
         '{"type": "standard", "services": ["Office Supplies"], "contact": "business@staples.com"}'::jsonb,
         NOW() - INTERVAL '3 years')
    ON CONFLICT DO NOTHING;

    -- ================================================================
    -- CREATE CONTRACTS
    -- ================================================================
    
    -- Create contracts for major vendors
    INSERT INTO contracts (vendor_id, title, status, contract_type, start_date, end_date, 
                          value, is_auto_renew, notes, enterprise_id, created_by, owner_id,
                          metadata, created_at)
    SELECT 
        v.id,
        v.name || ' - Annual Agreement 2024',
        CASE 
            WHEN v.name IN ('Microsoft Corporation', 'Salesforce', 'Amazon Web Services') THEN 'active'
            WHEN random() < 0.8 THEN 'active'
            ELSE 'pending_review'
        END::contract_status,
        CASE 
            WHEN v.category = 'consulting' THEN 'Professional Services'
            WHEN v.category = 'technology' THEN 'Software License'
            WHEN v.category = 'facilities' THEN 'Lease Agreement'
            ELSE 'Service Agreement'
        END,
        CASE 
            WHEN v.name = 'Microsoft Corporation' THEN NOW() - INTERVAL '11 months'
            WHEN v.name = 'Salesforce' THEN NOW() - INTERVAL '8 months'
            WHEN v.name = 'Amazon Web Services' THEN NOW() - INTERVAL '10 months'
            ELSE NOW() - INTERVAL '6 months' + (random() * INTERVAL '6 months')
        END::date,
        CASE 
            WHEN v.name = 'Microsoft Corporation' THEN NOW() + INTERVAL '1 month'
            WHEN v.name = 'Salesforce' THEN NOW() + INTERVAL '4 months'
            WHEN v.name = 'Amazon Web Services' THEN NOW() + INTERVAL '2 months'
            ELSE NOW() + INTERVAL '6 months' + (random() * INTERVAL '6 months')
        END::date,
        v.total_contract_value,
        (v.metadata->>'type' = 'strategic'),
        'Annual service agreement with ' || v.name,
        v.enterprise_id,
        v_user_id,
        v_user_id,
        jsonb_build_object(
            'vendor_type', v.metadata->>'type',
            'payment_terms', CASE 
                WHEN v.category = 'consulting' THEN 'Net 45'
                WHEN v.category = 'technology' THEN 'Net 30'
                ELSE 'Monthly'
            END,
            'renewal_notice', CASE 
                WHEN v.metadata->>'type' = 'strategic' THEN '90 days'
                WHEN v.metadata->>'type' = 'preferred' THEN '60 days'
                ELSE '30 days'
            END
        ),
        v.created_at + INTERVAL '7 days'
    FROM vendors v
    WHERE v.enterprise_id = v_enterprise_id
    AND v.total_contract_value > 0;

    -- ================================================================
    -- CREATE BUDGETS
    -- ================================================================
    
    INSERT INTO budgets (name, budget_type, total_budget, allocated_amount, 
                        spent_amount, committed_amount, status, department, owner_id, 
                        enterprise_id, start_date, end_date, created_by, created_at)
    VALUES
        ('IT & Technology', 'departmental'::budget_type, 1200000, 1000000, 650000, 200000, 
         'healthy'::budget_status, 'IT', v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-12-31'::date, v_user_id, NOW()),
         
        ('Professional Services', 'departmental'::budget_type, 600000, 500000, 380000, 100000, 
         'healthy'::budget_status, 'Operations', v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-12-31'::date, v_user_id, NOW()),
         
        ('Marketing & Sales', 'departmental'::budget_type, 400000, 350000, 220000, 80000, 
         'healthy'::budget_status, 'Marketing', v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-12-31'::date, v_user_id, NOW()),
         
        ('HR & Benefits', 'departmental'::budget_type, 300000, 280000, 195000, 60000, 
         'healthy'::budget_status, 'HR', v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-12-31'::date, v_user_id, NOW()),
         
        ('Legal & Compliance', 'departmental'::budget_type, 250000, 240000, 180000, 50000, 
         'healthy'::budget_status, 'Legal', v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-12-31'::date, v_user_id, NOW()),
         
        ('Facilities & Operations', 'departmental'::budget_type, 200000, 180000, 150000, 25000, 
         'healthy'::budget_status, 'Operations', v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-12-31'::date, v_user_id, NOW()),
         
        ('Q1 2024', 'quarterly'::budget_type, 750000, 750000, 720000, 0, 
         'exceeded'::budget_status, NULL, v_user_id, v_enterprise_id, '2024-01-01'::date, '2024-03-31'::date, v_user_id, NOW() - INTERVAL '9 months'),
         
        ('Q2 2024', 'quarterly'::budget_type, 800000, 800000, 785000, 0, 
         'exceeded'::budget_status, NULL, v_user_id, v_enterprise_id, '2024-04-01'::date, '2024-06-30'::date, v_user_id, NOW() - INTERVAL '6 months'),
         
        ('Q3 2024', 'quarterly'::budget_type, 850000, 850000, 450000, 200000, 
         'at_risk'::budget_status, NULL, v_user_id, v_enterprise_id, '2024-07-01'::date, '2024-09-30'::date, v_user_id, NOW() - INTERVAL '3 months'),
         
        ('Q4 2024', 'quarterly'::budget_type, 900000, 850000, 120000, 350000, 
         'healthy'::budget_status, NULL, v_user_id, v_enterprise_id, '2024-10-01'::date, '2024-12-31'::date, v_user_id, NOW())
    ON CONFLICT DO NOTHING;

    -- ================================================================
    -- CREATE NOTIFICATIONS
    -- ================================================================
    
    -- Contract renewal notifications
    INSERT INTO notifications (user_id, type, title, message, priority, status,
                              enterprise_id, created_at)
    SELECT 
        v_user_id,
        'contract_renewal',
        'Contract Renewal - ' || v.name,
        'Contract with ' || v.name || ' expires on ' || 
        to_char(c.end_date, 'Mon DD, YYYY') || ' (' ||
        EXTRACT(DAY FROM (c.end_date - NOW())) || ' days remaining)',
        CASE 
            WHEN c.end_date < NOW() + INTERVAL '30 days' THEN 'high'
            WHEN c.end_date < NOW() + INTERVAL '60 days' THEN 'medium'
            ELSE 'low'
        END,
        'unread',
        v_enterprise_id,
        NOW()
    FROM contracts c
    JOIN vendors v ON c.vendor_id = v.id
    WHERE c.enterprise_id = v_enterprise_id
    AND c.status = 'active'
    AND c.end_date < NOW() + INTERVAL '90 days';

    -- Budget alerts
    INSERT INTO notifications (user_id, type, title, message, priority, status,
                              enterprise_id, created_at)
    SELECT 
        v_user_id,
        'budget_alert',
        'Budget Alert - ' || b.name,
        b.name || ' budget is ' || 
        ROUND((b.spent_amount::numeric / NULLIF(b.total_budget, 0)::numeric) * 100) || '% utilized',
        CASE 
            WHEN (b.spent::numeric / NULLIF(b.amount, 0)::numeric) > 0.9 THEN 'high'
            WHEN (b.spent::numeric / NULLIF(b.amount, 0)::numeric) > 0.75 THEN 'medium'
            ELSE 'low'
        END,
        'unread',
        v_enterprise_id,
        NOW()
    FROM budgets b
    WHERE b.enterprise_id = v_enterprise_id
    AND b.status = 'active'
    AND b.total_budget > 0
    AND (b.spent_amount::numeric / b.total_budget::numeric) > 0.75;

    -- Welcome notification
    INSERT INTO notifications (user_id, type, title, message, priority, status,
                              enterprise_id, created_at)
    VALUES
        (v_user_id, 'system', 'Welcome to Pactwise!',
         'Your organization has been set up with sample data. Explore the dashboard to see vendors, contracts, and budgets.',
         'low', 'unread', v_enterprise_id, NOW());

    RAISE NOTICE 'Pactwise comprehensive seed data created successfully!';
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
    'Notifications' as entity,
    COUNT(*) as count 
FROM notifications 
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'

ORDER BY entity;

-- Show vendor distribution by category
SELECT 
    category,
    COUNT(*) as vendor_count,
    SUM(total_contract_value) as total_value,
    AVG(performance_score) as avg_performance,
    AVG(compliance_score) as avg_compliance
FROM vendors
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
GROUP BY category
ORDER BY total_value DESC;

-- Show contract status distribution
SELECT 
    status,
    COUNT(*) as contract_count,
    SUM(value) as total_value
FROM contracts
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
GROUP BY status
ORDER BY contract_count DESC;

-- Show upcoming renewals
SELECT 
    v.name as vendor,
    c.title as contract,
    c.end_date,
    c.value,
    EXTRACT(DAY FROM (c.end_date - NOW())) as days_until_expiry
FROM contracts c
JOIN vendors v ON c.vendor_id = v.id
WHERE c.enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
AND c.status = 'active'
AND c.end_date < NOW() + INTERVAL '90 days'
ORDER BY c.end_date
LIMIT 10;

-- Show budget utilization
SELECT 
    name,
    department,
    budget_type,
    total_budget,
    spent_amount,
    committed_amount,
    ROUND((spent_amount::numeric / NULLIF(total_budget, 0)::numeric) * 100) as utilization_percent,
    status
FROM budgets
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
AND status = 'healthy'
ORDER BY utilization_percent DESC;