-- ================================================================
-- CREATE DEMO USER WITH SEED DATA
-- ================================================================
-- This script creates a demo user account and populates it with
-- comprehensive seed data for demonstration purposes.
-- Regular user signups will NOT receive this seed data.
-- ================================================================

DO $$
DECLARE
    v_demo_enterprise_id UUID := gen_random_uuid();
    v_demo_user_auth_id UUID;
    v_demo_user_id UUID;
    v_vendor_id UUID;
    v_contract_id UUID;
    v_budget_id UUID;
BEGIN
    -- ================================================================
    -- STEP 1: CREATE DEMO USER IN AUTH SYSTEM
    -- ================================================================
    -- Create auth user with bcrypt hashed password for 'Demo123!@#'
    -- This hash was generated using bcrypt for the password 'Demo123!@#'
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'demo@pactwise.com',
        '$2a$10$xYZaBc123DeFgHiJkLmNoPqRsTuVwXyZ1234567890AbCdEfGhIjKl', -- Placeholder - will be replaced
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "Demo User"}'::jsonb,
        'authenticated',
        'authenticated'
    ) RETURNING id INTO v_demo_user_auth_id;

    -- Note: The actual password hash needs to be generated properly
    -- For now, we'll let the user sign up normally and then update the data

    -- ================================================================
    -- STEP 2: CREATE DEMO ENTERPRISE
    -- ================================================================
    INSERT INTO enterprises (
        id,
        name,
        domain,
        industry,
        size,
        contract_volume,
        primary_use_case,
        settings,
        metadata,
        created_at
    ) VALUES (
        v_demo_enterprise_id,
        'Demo Organization',
        NULL, -- Public email domain, no company domain
        'Technology',
        'Medium',
        0,
        'Contract Management',
        '{"demo": true, "is_personal": true}'::jsonb,
        '{"created_via": "demo_seed", "is_demo_account": true}'::jsonb,
        NOW()
    );

    -- ================================================================
    -- STEP 3: CREATE DEMO USER PROFILE
    -- ================================================================
    INSERT INTO users (
        auth_id,
        email,
        first_name,
        last_name,
        enterprise_id,
        role,
        department,
        title,
        created_at
    ) VALUES (
        v_demo_user_auth_id,
        'demo@pactwise.com',
        'Demo',
        'User',
        v_demo_enterprise_id,
        'owner',
        'Management',
        'Demo Account Owner',
        NOW()
    ) RETURNING id INTO v_demo_user_id;

    -- ================================================================
    -- STEP 4: CREATE ADDITIONAL TEAM MEMBERS
    -- ================================================================
    INSERT INTO users (email, auth_id, role, enterprise_id, department, title, first_name, last_name, created_at)
    VALUES
        ('john.doe@demo.pactwise.com', gen_random_uuid(), 'admin', v_demo_enterprise_id, 'Operations', 'COO', 'John', 'Doe', NOW()),
        ('sarah.smith@demo.pactwise.com', gen_random_uuid(), 'manager', v_demo_enterprise_id, 'Finance', 'CFO', 'Sarah', 'Smith', NOW()),
        ('mike.johnson@demo.pactwise.com', gen_random_uuid(), 'manager', v_demo_enterprise_id, 'Legal', 'Head of Legal', 'Mike', 'Johnson', NOW()),
        ('emily.chen@demo.pactwise.com', gen_random_uuid(), 'user', v_demo_enterprise_id, 'IT', 'IT Manager', 'Emily', 'Chen', NOW()),
        ('david.wilson@demo.pactwise.com', gen_random_uuid(), 'user', v_demo_enterprise_id, 'HR', 'HR Manager', 'David', 'Wilson', NOW());

    -- ================================================================
    -- STEP 5: CREATE VENDORS
    -- ================================================================

    -- Technology Vendors
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
         NOW() - INTERVAL '2 years')
    RETURNING id INTO v_vendor_id;

    -- ================================================================
    -- STEP 6: CREATE BUDGETS
    -- ================================================================
    INSERT INTO budgets (
        name,
        amount,
        period,
        fiscal_year,
        department,
        enterprise_id,
        created_by,
        created_at
    ) VALUES
        ('Technology Infrastructure 2025', 500000, 'annual', 2025, 'IT', v_demo_enterprise_id, v_demo_user_id, NOW()),
        ('Software Licenses Q1 2025', 150000, 'quarterly', 2025, 'IT', v_demo_enterprise_id, v_demo_user_id, NOW()),
        ('Consulting Services 2025', 300000, 'annual', 2025, 'Operations', v_demo_enterprise_id, v_demo_user_id, NOW());

    -- ================================================================
    -- STEP 7: CREATE CONTRACTS
    -- ================================================================

    -- Get vendor IDs
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Microsoft Corporation' AND enterprise_id = v_demo_enterprise_id;

    INSERT INTO contracts (
        title,
        vendor_id,
        contract_type,
        status,
        value,
        currency,
        start_date,
        end_date,
        auto_renewal,
        renewal_notice_days,
        payment_terms,
        enterprise_id,
        created_by,
        metadata,
        created_at
    ) VALUES
        ('Microsoft Enterprise Agreement',
         v_vendor_id,
         'subscription',
         'active',
         250000,
         'USD',
         NOW() - INTERVAL '6 months',
         NOW() + INTERVAL '2 years 6 months',
         true,
         90,
         'Annual payment in advance',
         v_demo_enterprise_id,
         v_demo_user_id,
         '{"license_count": 500, "services": ["Azure", "Office 365", "Teams"]}'::jsonb,
         NOW() - INTERVAL '6 months');

    -- Get Salesforce vendor ID
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Salesforce' AND enterprise_id = v_demo_enterprise_id;

    INSERT INTO contracts (
        title,
        vendor_id,
        contract_type,
        status,
        value,
        currency,
        start_date,
        end_date,
        auto_renewal,
        renewal_notice_days,
        payment_terms,
        enterprise_id,
        created_by,
        metadata,
        created_at
    ) VALUES
        ('Salesforce CRM Enterprise',
         v_vendor_id,
         'subscription',
         'active',
         180000,
         'USD',
         NOW() - INTERVAL '3 months',
         NOW() + INTERVAL '21 months',
         true,
         60,
         'Annual payment in advance',
         v_demo_enterprise_id,
         v_demo_user_id,
         '{"seats": 100, "edition": "Enterprise"}'::jsonb,
         NOW() - INTERVAL '3 months');

    -- Get AWS vendor ID
    SELECT id INTO v_vendor_id FROM vendors WHERE name = 'Amazon Web Services' AND enterprise_id = v_demo_enterprise_id;

    INSERT INTO contracts (
        title,
        vendor_id,
        contract_type,
        status,
        value,
        currency,
        start_date,
        end_date,
        auto_renewal,
        renewal_notice_days,
        payment_terms,
        enterprise_id,
        created_by,
        metadata,
        created_at
    ) VALUES
        ('AWS Cloud Infrastructure',
         v_vendor_id,
         'subscription',
         'active',
         320000,
         'USD',
         NOW() - INTERVAL '1 year',
         NOW() + INTERVAL '2 years',
         true,
         90,
         'Monthly billing in arrears',
         v_demo_enterprise_id,
         v_demo_user_id,
         '{"services": ["EC2", "S3", "RDS", "Lambda"], "support_level": "Enterprise"}'::jsonb,
         NOW() - INTERVAL '1 year');

    RAISE NOTICE 'Demo user created successfully!';
    RAISE NOTICE 'Email: demo@pactwise.com';
    RAISE NOTICE 'Enterprise ID: %', v_demo_enterprise_id;
    RAISE NOTICE 'User ID: %', v_demo_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: You must sign up through the UI with demo@pactwise.com and password Demo123!@#';
    RAISE NOTICE 'After signup, run this script again to populate the seed data.';

END $$;
