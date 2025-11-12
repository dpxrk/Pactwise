-- ================================================================
-- COMPREHENSIVE BULK DATA GENERATION
-- Generates 2000+ contracts, 500 vendors, 50 budgets
-- ================================================================

DO $$
DECLARE
    v_enterprise_id UUID;
    v_user_id UUID;
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
    -- Get enterprise and user
    SELECT id INTO v_enterprise_id FROM enterprises ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE enterprise_id = v_enterprise_id ORDER BY created_at DESC LIMIT 1;

    RAISE NOTICE 'Using enterprise: %', v_enterprise_id;
    RAISE NOTICE 'Using user: %', v_user_id;

    -- ============================================================
    -- STEP 1: CREATE 500 VENDORS
    -- ============================================================
    RAISE NOTICE 'Creating 500 vendors...';

    FOR i IN 1..500 LOOP
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

        IF i % 100 = 0 THEN
            RAISE NOTICE '  Created % vendors...', i;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Created 500 vendors';

    -- ============================================================
    -- STEP 2: CREATE 50 BUDGETS
    -- ============================================================
    RAISE NOTICE 'Creating 50 budgets...';

    FOR i IN 1..50 LOOP
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

    RAISE NOTICE '✅ Created 50 budgets';

    -- ============================================================
    -- STEP 3: CREATE 2000 CONTRACTS
    -- ============================================================
    RAISE NOTICE 'Creating 2000 contracts...';

    FOR i IN 1..2000 LOOP
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

        IF i % 200 = 0 THEN
            RAISE NOTICE '  Created % contracts...', i;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Created 2000 contracts';

    -- ============================================================
    -- STEP 4: UPDATE VENDOR STATISTICS
    -- ============================================================
    RAISE NOTICE 'Updating vendor statistics...';

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

    RAISE NOTICE '✅ Updated vendor statistics';

    -- ============================================================
    -- SUMMARY
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 BULK DATA GENERATION COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Vendors created: 500';
    RAISE NOTICE 'Budgets created: 50';
    RAISE NOTICE 'Contracts created: 2000';
    RAISE NOTICE 'Enterprise: %', v_enterprise_id;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';

END $$;
