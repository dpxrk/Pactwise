-- ================================================================
-- PACTWISE SEED DATA
-- Creates demo account and comprehensive test data
-- ================================================================
-- This file runs automatically when executing `supabase db reset`
--
-- Contents:
-- 1. Demo enterprise and user
-- 2. 50 vendors
-- 3. 20 budgets
-- 4. 200 contracts
--
-- NOTE: For larger datasets (500 vendors, 2000 contracts), use:
-- backend/scripts/generate-bulk-data.sql
-- ================================================================

DO $$
DECLARE
    v_enterprise_id UUID;
    v_user_id UUID;
    v_auth_user_id UUID;
    v_vendor_ids UUID[] := '{}';
    v_vendor_id UUID;
    v_budget_ids UUID[] := '{}';
    v_contract_id UUID;
    v_category TEXT;
    v_status TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_value NUMERIC;
    v_contract_type TEXT;
    v_departments TEXT[] := ARRAY['IT', 'Finance', 'Legal', 'Marketing', 'HR', 'Operations', 'Sales', 'R&D'];
    v_categories TEXT[] := ARRAY['technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other'];
    v_contract_types TEXT[] := ARRAY['nda', 'msa', 'saas', 'license', 'consulting', 'employment', 'procurement', 'partnership'];
    v_statuses TEXT[] := ARRAY['active', 'pending', 'inactive'];
    i INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🌱 PACTWISE SEED DATA GENERATION';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Temporarily disable triggers that may cause issues during bulk insert
    ALTER TABLE vendors DISABLE TRIGGER update_vendor_search_index;
    ALTER TABLE contracts DISABLE TRIGGER update_contract_search_index;
    RAISE NOTICE 'Disabled search index triggers for bulk insert';
    RAISE NOTICE '';

    -- ============================================================
    -- STEP 1: CREATE DEMO ENTERPRISE
    -- ============================================================
    RAISE NOTICE '1. Creating demo enterprise...';

    INSERT INTO enterprises (
        name,
        domain,
        industry,
        size,
        contract_volume,
        primary_use_case,
        settings,
        metadata
    ) VALUES (
        'Pactwise Organization',
        'pactwise.com',
        'Technology',
        'Medium',
        2000,
        'Contract Management',
        jsonb_build_object(
            'demo', true,
            'is_personal', false,
            'enable_ai_features', true,
            'enable_email_notifications', true
        ),
        jsonb_build_object(
            'created_via', 'seed_data',
            'seed_version', '1.0'
        )
    ) RETURNING id INTO v_enterprise_id;

    RAISE NOTICE '   ✅ Created enterprise: % (Pactwise Organization)', v_enterprise_id;

    -- ============================================================
    -- STEP 2: CREATE DEMO AUTH USER
    -- ============================================================
    RAISE NOTICE '2. Creating demo auth user...';

    -- Create auth user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        aud,
        role
    ) VALUES (
        uuid_generate_v4(),
        '00000000-0000-0000-0000-000000000000',
        'demo@pactwise.com',
        crypt('Demo123!@#', gen_salt('bf')),  -- Password: Demo123!@#
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Demo User"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        '',
        'authenticated',
        'authenticated'
    ) RETURNING id INTO v_auth_user_id;

    RAISE NOTICE '   ✅ Created auth user: % (demo@pactwise.com)', v_auth_user_id;

    -- ============================================================
    -- STEP 3: CREATE DEMO USER PROFILE
    -- ============================================================
    RAISE NOTICE '3. Creating demo user profile...';

    INSERT INTO users (
        auth_id,
        email,
        first_name,
        last_name,
        enterprise_id,
        role,
        department,
        title,
        settings
    ) VALUES (
        v_auth_user_id,
        'demo@pactwise.com',
        'Demo',
        'User',
        v_enterprise_id,
        'owner',
        'Administration',
        'Account Owner',
        jsonb_build_object(
            'demo_account', true,
            'created_via', 'seed_data'
        )
    ) RETURNING id INTO v_user_id;

    RAISE NOTICE '   ✅ Created user profile: % (Demo User)', v_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '   📧 Demo Account Credentials:';
    RAISE NOTICE '      Email: demo@pactwise.com';
    RAISE NOTICE '      Password: Demo123!@#';
    RAISE NOTICE '';

    -- ============================================================
    -- STEP 4: CREATE 50 VENDORS
    -- ============================================================
    RAISE NOTICE '4. Creating 50 vendors...';

    FOR i IN 1..50 LOOP
        v_category := v_categories[1 + floor(random() * array_length(v_categories, 1))];
        v_status := CASE
            WHEN random() > 0.1 THEN 'active'
            WHEN random() > 0.5 THEN 'pending'
            ELSE 'inactive'
        END;

        INSERT INTO vendors (
            name,
            category,
            status,
            website,
            street_address_1,
            city,
            state_province,
            country,
            postal_code,
            performance_score,
            compliance_score,
            total_contract_value,
            active_contracts,
            enterprise_id,
            created_by,
            metadata
        ) VALUES (
            'Company ' || i || ' ' || initcap(v_category),
            v_category::vendor_category,
            v_status::vendor_status,
            'https://company' || i || '.com',
            i || ' Main Street',
            'City' || (i % 50 + 1),
            'State' || (i % 50 + 1),
            'US',
            lpad((10000 + i)::text, 5, '0'),
            3.0 + (random() * 2.0)::numeric(3,2),
            3.0 + (random() * 2.0)::numeric(3,2),
            0,
            0,
            v_enterprise_id,
            v_user_id,
            jsonb_build_object(
                'tax_id', 'TAX' || lpad(i::text, 6, '0'),
                'employees', (50 + floor(random() * 10000))::integer,
                'certifications', ARRAY['ISO 9001', 'SOC 2 Type II']::text[]
            )
        ) RETURNING id INTO v_vendor_id;

        v_vendor_ids := array_append(v_vendor_ids, v_vendor_id);

        IF i % 10 = 0 THEN
            RAISE NOTICE '   Created % vendors...', i;
        END IF;
    END LOOP;

    RAISE NOTICE '   ✅ Created 50 vendors';

    -- ============================================================
    -- STEP 5: CREATE 20 BUDGETS
    -- ============================================================
    RAISE NOTICE '5. Creating 20 budgets...';

    FOR i IN 1..20 LOOP
        INSERT INTO budgets (
            name,
            budget_type,
            total_budget,
            allocated_amount,
            spent_amount,
            committed_amount,
            start_date,
            end_date,
            department,
            status,
            enterprise_id,
            created_by,
            metadata
        ) VALUES (
            v_departments[1 + floor(random() * array_length(v_departments, 1))] || ' Budget ' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || i,
            (ARRAY['annual', 'quarterly', 'monthly', 'project', 'department'])[1 + floor(random() * 5)]::budget_type,
            100000 + floor(random() * 900000),
            50000 + floor(random() * 450000),
            20000 + floor(random() * 200000),
            10000 + floor(random() * 100000),
            CURRENT_DATE - INTERVAL '6 months',
            CURRENT_DATE + INTERVAL '6 months',
            v_departments[1 + floor(random() * array_length(v_departments, 1))],
            'healthy'::budget_status,
            v_enterprise_id,
            v_user_id,
            jsonb_build_object('fiscal_year', EXTRACT(YEAR FROM CURRENT_DATE))
        );
    END LOOP;

    RAISE NOTICE '   ✅ Created 20 budgets';

    -- ============================================================
    -- STEP 6: CREATE 200 CONTRACTS
    -- ============================================================
    RAISE NOTICE '6. Creating 200 contracts...';

    FOR i IN 1..200 LOOP
        -- Random vendor
        v_vendor_id := v_vendor_ids[1 + floor(random() * array_length(v_vendor_ids, 1))];

        -- Random contract type
        v_contract_type := v_contract_types[1 + floor(random() * array_length(v_contract_types, 1))];

        -- Random dates (last 3 years to next year)
        v_start_date := CURRENT_DATE - (floor(random() * 1095)::integer || ' days')::INTERVAL;
        v_end_date := v_start_date + (floor(random() * 730 + 365)::integer || ' days')::INTERVAL;

        -- Random value based on contract type
        v_value := CASE v_contract_type
            WHEN 'nda' THEN 0
            WHEN 'msa' THEN 100000 + floor(random() * 900000)
            WHEN 'saas' THEN 50000 + floor(random() * 150000)
            WHEN 'license' THEN 100000 + floor(random() * 400000)
            WHEN 'consulting' THEN 150000 + floor(random() * 350000)
            WHEN 'employment' THEN 80000 + floor(random() * 200000)
            WHEN 'procurement' THEN 300000 + floor(random() * 700000)
            WHEN 'partnership' THEN 500000 + floor(random() * 1500000)
            ELSE 50000 + floor(random() * 200000)
        END;

        -- Status based on dates
        v_status := CASE
            WHEN v_end_date < CURRENT_DATE THEN 'expired'
            WHEN v_start_date > CURRENT_DATE THEN 'draft'
            ELSE 'active'
        END;

        INSERT INTO contracts (
            title,
            vendor_id,
            contract_type,
            status,
            value,
            start_date,
            end_date,
            is_auto_renew,
            enterprise_id,
            created_by,
            analysis_status,
            metadata
        ) VALUES (
            initcap(v_contract_type) || ' Agreement - Contract ' || i,
            v_vendor_id,
            v_contract_type,
            v_status::contract_status,
            v_value,
            v_start_date,
            v_end_date,
            random() > 0.5,
            v_enterprise_id,
            v_user_id,
            'completed'::analysis_status,
            jsonb_build_object(
                'generated', true,
                'contract_number', 'CTR-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || lpad(i::text, 6, '0'),
                'terms_months', EXTRACT(MONTH FROM AGE(v_end_date, v_start_date))::integer,
                'payment_terms', (ARRAY['Net 30', 'Net 60', 'Due on receipt', 'Monthly in advance'])[1 + floor(random() * 4)],
                'renewal_notice_days', (ARRAY[30, 60, 90])[1 + floor(random() * 3)]
            )
        );

        IF i % 50 = 0 THEN
            RAISE NOTICE '   Created % contracts...', i;
        END IF;
    END LOOP;

    RAISE NOTICE '   ✅ Created 200 contracts';

    -- ============================================================
    -- STEP 7: UPDATE VENDOR STATISTICS
    -- ============================================================
    RAISE NOTICE '7. Updating vendor statistics...';

    UPDATE vendors v
    SET
        total_contract_value = COALESCE(stats.total_value, 0),
        active_contracts = COALESCE(stats.active_count, 0)
    FROM (
        SELECT
            vendor_id,
            SUM(value) as total_value,
            COUNT(*) FILTER (WHERE status = 'active') as active_count
        FROM contracts
        WHERE enterprise_id = v_enterprise_id
        GROUP BY vendor_id
    ) stats
    WHERE v.id = stats.vendor_id
    AND v.enterprise_id = v_enterprise_id;

    RAISE NOTICE '   ✅ Updated vendor statistics';

    -- ============================================================
    -- RE-ENABLE TRIGGERS
    -- ============================================================
    RAISE NOTICE '8. Re-enabling search index triggers...';

    ALTER TABLE vendors ENABLE TRIGGER update_vendor_search_index;
    ALTER TABLE contracts ENABLE TRIGGER update_contract_search_index;

    RAISE NOTICE '   ✅ Re-enabled search index triggers';

    -- ============================================================
    -- SUMMARY
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 SEED DATA GENERATION COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Enterprise: Pactwise Organization';
    RAISE NOTICE '  - ID: %', v_enterprise_id;
    RAISE NOTICE '  - Vendors: 50';
    RAISE NOTICE '  - Budgets: 20';
    RAISE NOTICE '  - Contracts: 200';
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Account:';
    RAISE NOTICE '  - Email: demo@pactwise.com';
    RAISE NOTICE '  - Password: Demo123!@#';
    RAISE NOTICE '  - User ID: %', v_user_id;
    RAISE NOTICE '  - Role: owner';
    RAISE NOTICE '';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '  - 50 vendors created';
    RAISE NOTICE '  - 20 budgets created';
    RAISE NOTICE '  - 200 contracts created';
    RAISE NOTICE '  - All vendor statistics updated';
    RAISE NOTICE '';
    RAISE NOTICE 'For larger datasets (500 vendors, 2000 contracts), run:';
    RAISE NOTICE '  docker cp backend/scripts/generate-bulk-data.sql supabase_db_pactwise:/tmp/';
    RAISE NOTICE '  docker exec supabase_db_pactwise psql -U postgres -d postgres -f /tmp/generate-bulk-data.sql';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ You can now login with demo@pactwise.com / Demo123!@#';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

END $$;
