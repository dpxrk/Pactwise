-- ================================================================
-- PACTWISE SIMPLE SEED DATA
-- ================================================================
-- This script creates seed data for Pactwise Organization
-- Error tolerant version that creates data step by step
-- ================================================================

\set ON_ERROR_STOP off

-- ================================================================
-- STEP 1: CREATE VENDORS
-- ================================================================

INSERT INTO vendors (name, category, status, website, enterprise_id, created_by, metadata)
SELECT 
    name, category::vendor_category, status::vendor_status, website, 
    '7328ef75-2d46-4892-8562-20e450343cbd'::uuid,
    (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1),
    metadata::jsonb
FROM (VALUES
    ('Microsoft Corporation', 'technology', 'active', 'https://microsoft.com', 
     '{"type": "strategic", "services": ["Azure", "Office 365"], "spend": 250000}'),
    ('Salesforce', 'technology', 'active', 'https://salesforce.com',
     '{"type": "strategic", "services": ["CRM"], "spend": 180000}'),
    ('Amazon Web Services', 'technology', 'active', 'https://aws.amazon.com',
     '{"type": "strategic", "services": ["Cloud"], "spend": 320000}'),
    ('Google Workspace', 'technology', 'active', 'https://workspace.google.com',
     '{"type": "preferred", "services": ["Email", "Docs"], "spend": 45000}'),
    ('Slack', 'technology', 'active', 'https://slack.com',
     '{"type": "preferred", "services": ["Communication"], "spend": 25000}'),
    ('HubSpot', 'marketing', 'active', 'https://hubspot.com',
     '{"type": "preferred", "services": ["Marketing"], "spend": 60000}'),
    ('LinkedIn Ads', 'marketing', 'active', 'https://linkedin.com',
     '{"type": "standard", "services": ["Advertising"], "spend": 48000}'),
    ('Deloitte', 'consulting', 'active', 'https://deloitte.com',
     '{"type": "strategic", "services": ["Consulting"], "spend": 450000}'),
    ('McKinsey', 'consulting', 'active', 'https://mckinsey.com',
     '{"type": "preferred", "services": ["Strategy"], "spend": 280000}'),
    ('ADP', 'hr', 'active', 'https://adp.com',
     '{"type": "strategic", "services": ["Payroll"], "spend": 95000}'),
    ('Workday', 'hr', 'active', 'https://workday.com',
     '{"type": "strategic", "services": ["HRIS"], "spend": 120000}'),
    ('Ernst & Young', 'finance', 'active', 'https://ey.com',
     '{"type": "strategic", "services": ["Audit"], "spend": 180000}'),
    ('Stripe', 'finance', 'active', 'https://stripe.com',
     '{"type": "preferred", "services": ["Payments"], "spend": 0}'),
    ('Wilson Sonsini', 'legal', 'active', 'https://wsgr.com',
     '{"type": "strategic", "services": ["Legal"], "spend": 240000}'),
    ('DocuSign', 'legal', 'active', 'https://docusign.com',
     '{"type": "preferred", "services": ["E-Signatures"], "spend": 24000}'),
    ('WeWork', 'facilities', 'active', 'https://wework.com',
     '{"type": "preferred", "services": ["Office Space"], "spend": 180000}'),
    ('Staples', 'facilities', 'active', 'https://staples.com',
     '{"type": "standard", "services": ["Supplies"], "spend": 24000}')
) AS v(name, category, status, website, metadata)
ON CONFLICT DO NOTHING;

-- Update vendor scores and values
UPDATE vendors 
SET 
    performance_score = 4.0 + (random() * 1.0),
    compliance_score = 4.0 + (random() * 1.0),
    total_contract_value = (metadata->>'spend')::numeric,
    active_contracts = CASE 
        WHEN metadata->>'type' = 'strategic' THEN 2
        ELSE 1
    END
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
AND total_contract_value IS NULL;

-- ================================================================
-- STEP 2: CREATE CONTRACTS
-- ================================================================

INSERT INTO contracts (vendor_id, title, status, contract_type, start_date, end_date, 
                      value, is_auto_renew, notes, enterprise_id, created_by, owner_id, metadata)
SELECT 
    v.id,
    v.name || ' - Service Agreement 2024',
    'active'::contract_status,
    'Service Agreement',
    '2024-01-01'::date,
    '2024-12-31'::date,
    COALESCE((v.metadata->>'spend')::numeric, 50000),
    true,
    'Annual service agreement',
    v.enterprise_id,
    (SELECT id FROM users WHERE enterprise_id = v.enterprise_id LIMIT 1),
    (SELECT id FROM users WHERE enterprise_id = v.enterprise_id LIMIT 1),
    jsonb_build_object(
        'vendor_type', v.metadata->>'type',
        'payment_terms', 'Net 30'
    )
FROM vendors v
WHERE v.enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
AND NOT EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.vendor_id = v.id
);

-- ================================================================
-- STEP 3: CREATE BUDGETS
-- ================================================================

INSERT INTO budgets (name, budget_type, total_budget, allocated_amount, 
                    spent_amount, committed_amount, status, department, owner_id, 
                    enterprise_id, start_date, end_date, created_by)
VALUES
    ('IT & Technology Budget', 'annual'::budget_type, 1200000, 1000000, 650000, 200000, 
     'healthy'::budget_status, 'IT', 
     (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1), 
     '7328ef75-2d46-4892-8562-20e450343cbd', 
     '2024-01-01'::date, '2024-12-31'::date,
     (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1)),
     
    ('Marketing Budget', 'annual'::budget_type, 400000, 350000, 220000, 80000, 
     'healthy'::budget_status, 'Marketing', 
     (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1), 
     '7328ef75-2d46-4892-8562-20e450343cbd', 
     '2024-01-01'::date, '2024-12-31'::date,
     (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1)),
     
    ('Q4 2024 Budget', 'quarterly'::budget_type, 900000, 850000, 120000, 350000, 
     'healthy'::budget_status, NULL, 
     (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1), 
     '7328ef75-2d46-4892-8562-20e450343cbd', 
     '2024-10-01'::date, '2024-12-31'::date,
     (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1))
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 4: CREATE NOTIFICATIONS
-- ================================================================

INSERT INTO notifications (user_id, type, title, message, priority, status, enterprise_id)
SELECT 
    (SELECT id FROM users WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd' LIMIT 1),
    'system',
    'Welcome to Pactwise!',
    'Your organization has been set up with sample vendors and contracts. Explore the dashboard to get started.',
    'low',
    'unread',
    '7328ef75-2d46-4892-8562-20e450343cbd'
WHERE NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
    AND type = 'system'
    AND title = 'Welcome to Pactwise!'
);

-- Contract renewal notifications
INSERT INTO notifications (user_id, type, title, message, priority, status, enterprise_id)
SELECT 
    (SELECT id FROM users WHERE enterprise_id = c.enterprise_id LIMIT 1),
    'contract_renewal',
    'Contract Expiring Soon',
    'Contract "' || c.title || '" expires on ' || to_char(c.end_date, 'Mon DD, YYYY'),
    CASE 
        WHEN c.end_date < CURRENT_DATE + INTERVAL '30 days' THEN 'high'
        WHEN c.end_date < CURRENT_DATE + INTERVAL '60 days' THEN 'medium'
        ELSE 'low'
    END,
    'unread',
    c.enterprise_id
FROM contracts c
WHERE c.enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
AND c.status = 'active'
AND c.end_date < CURRENT_DATE + INTERVAL '90 days'
ON CONFLICT DO NOTHING;

-- ================================================================
-- VERIFY DATA CREATION
-- ================================================================

SELECT 'Data Summary:' as report;

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

-- Show vendors by category
SELECT 
    category,
    COUNT(*) as vendor_count
FROM vendors
WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd'
GROUP BY category
ORDER BY vendor_count DESC;