#!/bin/bash

# ================================================================
# CREATE DEMO USER SCRIPT
# ================================================================
# This script creates a demo user with email demo@pactwise.com
# and password Demo123!@# with comprehensive seed data
# ================================================================

set -e

echo "🚀 Creating demo user account..."

# Create the demo user using Supabase CLI
# Note: This requires the user to sign up through the UI first
# We'll create the enterprise and seed data structure

psql postgresql://postgres:postgres@127.0.0.1:54322/postgres <<EOF

DO \$\$
DECLARE
    v_demo_enterprise_id UUID := gen_random_uuid();
    v_demo_user_id UUID;
    v_vendor_id UUID;
    v_contract_id UUID;
    v_budget_id UUID;
    v_auth_user_id UUID;
BEGIN
    -- Check if demo user already exists
    SELECT id INTO v_auth_user_id FROM auth.users WHERE email = 'demo@pactwise.com';

    IF v_auth_user_id IS NULL THEN
        RAISE NOTICE '⚠️  Demo user does not exist in auth.users';
        RAISE NOTICE '📝 Please sign up at http://localhost:3000/auth/sign-up with:';
        RAISE NOTICE '   Email: demo@pactwise.com';
        RAISE NOTICE '   Password: Demo123!@#';
        RAISE NOTICE '';
        RAISE NOTICE 'After signing up, run this script again to add seed data.';
        RETURN;
    END IF;

    -- Check if user profile exists
    SELECT id INTO v_demo_user_id FROM users WHERE auth_id = v_auth_user_id;

    IF v_demo_user_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found for auth user';
    END IF;

    -- Get the enterprise ID for this user
    SELECT enterprise_id INTO v_demo_enterprise_id FROM users WHERE id = v_demo_user_id;

    -- Mark this enterprise as a demo account
    UPDATE enterprises
    SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_demo_account": true}'::jsonb,
        settings = COALESCE(settings, '{}'::jsonb) || '{"demo": true}'::jsonb
    WHERE id = v_demo_enterprise_id;

    RAISE NOTICE '✅ Found demo user, adding seed data...';

    -- ================================================================
    -- CREATE ADDITIONAL TEAM MEMBERS
    -- ================================================================
    INSERT INTO users (email, auth_id, role, enterprise_id, department, title, first_name, last_name, created_at)
    VALUES
        ('john.doe@demo.pactwise.com', gen_random_uuid(), 'admin', v_demo_enterprise_id, 'Operations', 'COO', 'John', 'Doe', NOW()),
        ('sarah.smith@demo.pactwise.com', gen_random_uuid(), 'manager', v_demo_enterprise_id, 'Finance', 'CFO', 'Sarah', 'Smith', NOW()),
        ('mike.johnson@demo.pactwise.com', gen_random_uuid(), 'manager', v_demo_enterprise_id, 'Legal', 'Head of Legal', 'Mike', 'Johnson', NOW()),
        ('emily.chen@demo.pactwise.com', gen_random_uuid(), 'user', v_demo_enterprise_id, 'IT', 'IT Manager', 'Emily', 'Chen', NOW()),
        ('david.wilson@demo.pactwise.com', gen_random_uuid(), 'user', v_demo_enterprise_id, 'HR', 'HR Manager', 'David', 'Wilson', NOW())
    ON CONFLICT (email) DO NOTHING;

    -- ================================================================
    -- CREATE VENDORS
    -- ================================================================
    INSERT INTO vendors (name, category, status, website, enterprise_id,
                        performance_score, compliance_score, total_contract_value,
                        active_contracts, created_by, metadata, created_at)
    VALUES
        ('Microsoft Corporation', 'technology', 'active', 'https://microsoft.com', v_demo_enterprise_id,
         4.5, 4.8, 250000, 3, v_demo_user_id,
         '{"type": "strategic", "services": ["Azure", "Office 365", "Teams"], "contact": "enterprise@microsoft.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),

        ('Salesforce', 'technology', 'active', 'https://salesforce.com', v_demo_enterprise_id,
         4.3, 4.7, 180000, 2, v_demo_user_id,
         '{"type": "strategic", "services": ["CRM", "Marketing Cloud"], "contact": "sales@salesforce.com"}'::jsonb,
         NOW() - INTERVAL '18 months'),

        ('Slack Technologies', 'technology', 'active', 'https://slack.com', v_demo_enterprise_id,
         4.6, 4.5, 45000, 1, v_demo_user_id,
         '{"type": "preferred", "services": ["Communication"], "contact": "sales@slack.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),

        ('Amazon Web Services', 'technology', 'active', 'https://aws.amazon.com', v_demo_enterprise_id,
         4.7, 4.9, 320000, 2, v_demo_user_id,
         '{"type": "strategic", "services": ["Cloud Infrastructure"], "contact": "enterprise@aws.amazon.com"}'::jsonb,
         NOW() - INTERVAL '3 years'),

        ('Google Cloud Platform', 'technology', 'active', 'https://cloud.google.com', v_demo_enterprise_id,
         4.5, 4.8, 85000, 1, v_demo_user_id,
         '{"type": "preferred", "services": ["Cloud", "AI/ML"], "contact": "sales@google.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),

        ('Deloitte', 'consulting', 'active', 'https://deloitte.com', v_demo_enterprise_id,
         4.2, 4.8, 450000, 2, v_demo_user_id,
         '{"type": "strategic", "services": ["Consulting", "Audit"], "contact": "consulting@deloitte.com"}'::jsonb,
         NOW() - INTERVAL '2 years'),

        ('McKinsey & Company', 'consulting', 'active', 'https://mckinsey.com', v_demo_enterprise_id,
         4.4, 4.7, 280000, 1, v_demo_user_id,
         '{"type": "preferred", "services": ["Management Consulting"], "contact": "consulting@mckinsey.com"}'::jsonb,
         NOW() - INTERVAL '1 year')
    ON CONFLICT DO NOTHING;

    -- ================================================================
    -- CREATE BUDGETS
    -- ================================================================
    INSERT INTO budgets (
        name,
        budget_type,
        total_budget,
        allocated_amount,
        spent_amount,
        start_date,
        end_date,
        department,
        enterprise_id,
        created_by,
        created_at
    ) VALUES
        ('Technology Infrastructure 2025', 'annual', 500000, 250000, 125000, '2025-01-01', '2025-12-31', 'IT', v_demo_enterprise_id, v_demo_user_id, NOW()),
        ('Software Licenses Q1 2025', 'quarterly', 150000, 120000, 45000, '2025-01-01', '2025-03-31', 'IT', v_demo_enterprise_id, v_demo_user_id, NOW()),
        ('Consulting Services 2025', 'annual', 300000, 180000, 90000, '2025-01-01', '2025-12-31', 'Operations', v_demo_enterprise_id, v_demo_user_id, NOW()),
        ('Professional Services 2025', 'annual', 200000, 150000, 75000, '2025-01-01', '2025-12-31', 'Legal', v_demo_enterprise_id, v_demo_user_id, NOW())
    ON CONFLICT DO NOTHING;

    -- ================================================================
    -- CREATE CONTRACTS
    -- ================================================================

    -- Microsoft Contract
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Microsoft Corporation' AND enterprise_id = v_demo_enterprise_id;
    INSERT INTO contracts (
        title, vendor_id, contract_type, status, value,
        start_date, end_date, is_auto_renew,
        enterprise_id, created_by, metadata, created_at
    ) VALUES
        ('Microsoft Enterprise Agreement', v_vendor_id, 'subscription', 'active',
         250000, NOW() - INTERVAL '6 months', NOW() + INTERVAL '2 years 6 months',
         true, v_demo_enterprise_id, v_demo_user_id,
         '{"license_count": 500, "services": ["Azure", "Office 365", "Teams"], "currency": "USD", "renewal_notice_days": 90, "payment_terms": "Annual payment in advance"}'::jsonb,
         NOW() - INTERVAL '6 months')
    ON CONFLICT DO NOTHING;

    -- Salesforce Contract
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Salesforce' AND enterprise_id = v_demo_enterprise_id;
    INSERT INTO contracts (
        title, vendor_id, contract_type, status, value,
        start_date, end_date, is_auto_renew,
        enterprise_id, created_by, metadata, created_at
    ) VALUES
        ('Salesforce CRM Enterprise', v_vendor_id, 'subscription', 'active',
         180000, NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months',
         true, v_demo_enterprise_id, v_demo_user_id,
         '{"seats": 100, "edition": "Enterprise", "currency": "USD", "renewal_notice_days": 60, "payment_terms": "Annual payment in advance"}'::jsonb,
         NOW() - INTERVAL '3 months')
    ON CONFLICT DO NOTHING;

    -- AWS Contract
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Amazon Web Services' AND enterprise_id = v_demo_enterprise_id;
    INSERT INTO contracts (
        title, vendor_id, contract_type, status, value,
        start_date, end_date, is_auto_renew,
        enterprise_id, created_by, metadata, created_at
    ) VALUES
        ('AWS Cloud Infrastructure', v_vendor_id, 'subscription', 'active',
         320000, NOW() - INTERVAL '1 year', NOW() + INTERVAL '2 years',
         true, v_demo_enterprise_id, v_demo_user_id,
         '{"services": ["EC2", "S3", "RDS", "Lambda"], "support_level": "Enterprise", "currency": "USD", "renewal_notice_days": 90, "payment_terms": "Monthly billing in arrears"}'::jsonb,
         NOW() - INTERVAL '1 year')
    ON CONFLICT DO NOTHING;

    -- Slack Contract
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Slack Technologies' AND enterprise_id = v_demo_enterprise_id;
    INSERT INTO contracts (
        title, vendor_id, contract_type, status, value,
        start_date, end_date, is_auto_renew,
        enterprise_id, created_by, metadata, created_at
    ) VALUES
        ('Slack Business+ Plan', v_vendor_id, 'subscription', 'active',
         45000, NOW() - INTERVAL '8 months', NOW() + INTERVAL '16 months',
         true, v_demo_enterprise_id, v_demo_user_id,
         '{"seats": 150, "plan": "Business+", "currency": "USD", "renewal_notice_days": 30, "payment_terms": "Annual payment in advance"}'::jsonb,
         NOW() - INTERVAL '8 months')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ Demo account setup complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   • 5 team members added';
    RAISE NOTICE '   • 7 vendors created';
    RAISE NOTICE '   • 4 budgets created';
    RAISE NOTICE '   • 4 active contracts created';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Login credentials:';
    RAISE NOTICE '   Email: demo@pactwise.com';
    RAISE NOTICE '   Password: Demo123!@#';
    RAISE NOTICE '';
    RAISE NOTICE '🌐 Access at: http://localhost:3000/auth/sign-in';

END \$\$;

EOF

echo ""
echo "✅ Script execution complete!"
