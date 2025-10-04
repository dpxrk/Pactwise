-- ================================================================
-- ENHANCED VENDOR SEED DATA WITH ANALYTICS
-- ================================================================
-- This script creates comprehensive vendor data with performance metrics,
-- spend trends, and detailed metadata for rich UI displays
-- ================================================================

DO $$
DECLARE
    v_enterprise_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the first enterprise (or you can specify a specific enterprise name)
    SELECT id INTO v_enterprise_id FROM enterprises LIMIT 1;

    -- Get the owner user ID for that enterprise
    SELECT id INTO v_user_id FROM users
    WHERE enterprise_id = v_enterprise_id AND role = 'owner'
    LIMIT 1;

    -- Delete existing demo vendors for this enterprise (clean slate)
    DELETE FROM vendors WHERE enterprise_id = v_enterprise_id AND is_demo = true;

    -- ================================================================
    -- CREATE ENHANCED VENDORS WITH FULL ANALYTICS
    -- ================================================================

    INSERT INTO vendors (
        name, category, status, address,
        contact_name, contact_email, contact_phone,
        performance_score, compliance_score,
        total_contract_value, active_contracts,
        enterprise_id, created_by, is_demo, metadata, created_at
    ) VALUES

    -- Technology Vendors (High Value)
    (
        'CloudTech Solutions', 'technology', 'active',
        '100 Tech Drive, San Francisco, CA 94105',
        'Sarah Chen', 'sarah.chen@cloudtech.com', '+1 (555) 123-4568',
        0.95, 0.98, 2400000, 5,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[2.1, 2.15, 2.25, 2.3, 2.2, 2.35, 2.4, 2.38, 2.42, 2.45, 2.4, 2.4],
            'risk_level', 'low',
            'last_audit_date', '2024-09-15',
            'next_renewal_date', '2025-06-30',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'VP of Sales',
            'industry', 'Cloud Infrastructure',
            'employee_count', 5000,
            'founded_year', 2010,
            'certifications', ARRAY['ISO 27001', 'SOC 2 Type II', 'GDPR'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'renewal', 'description', 'Contract renewal completed', 'date', '2024-09-28'),
                jsonb_build_object('type', 'review', 'description', 'Performance review submitted', 'date', '2024-09-21'),
                jsonb_build_object('type', 'payment', 'description', 'Payment processed', 'date', '2024-09-14')
            )
        ),
        NOW() - INTERVAL '2 years'
    ),

    (
        'DataFlow Systems', 'technology', 'active',
        '500 Market St, Seattle, WA 98101',
        'Michael Rodriguez', 'michael.r@dataflow.io', '+1 (555) 234-5679',
        0.88, 0.92, 1800000, 3,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[1.5, 1.55, 1.6, 1.7, 1.75, 1.8, 1.78, 1.82, 1.8, 1.8, 1.78, 1.8],
            'risk_level', 'low',
            'last_audit_date', '2024-08-10',
            'next_renewal_date', '2025-03-15',
            'payment_terms', 'Net 45',
            'primary_contact_title', 'Director of Partnerships',
            'industry', 'Data Analytics',
            'employee_count', 2500,
            'founded_year', 2015,
            'certifications', ARRAY['SOC 2 Type II', 'HIPAA'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'meeting', 'description', 'Quarterly business review completed', 'date', '2024-09-25'),
                jsonb_build_object('type', 'payment', 'description', 'Payment processed', 'date', '2024-09-01')
            )
        ),
        NOW() - INTERVAL '18 months'
    ),

    (
        'SecureNet Inc', 'technology', 'active',
        '200 Cyber Blvd, Austin, TX 78701',
        'Jennifer Lee', 'jlee@securenet.com', '+1 (555) 345-6790',
        0.92, 0.96, 980000, 2,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.85, 0.88, 0.9, 0.92, 0.95, 0.97, 0.98, 0.99, 0.98, 0.98, 0.97, 0.98],
            'risk_level', 'low',
            'last_audit_date', '2024-09-01',
            'next_renewal_date', '2025-12-31',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Chief Security Officer',
            'industry', 'Cybersecurity',
            'employee_count', 800,
            'founded_year', 2012,
            'certifications', ARRAY['ISO 27001', 'SOC 2 Type II', 'FedRAMP'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'audit', 'description', 'Security audit passed', 'date', '2024-09-01'),
                jsonb_build_object('type', 'training', 'description', 'Security training completed', 'date', '2024-08-15')
            )
        ),
        NOW() - INTERVAL '3 years'
    ),

    -- Professional Services (Medium-High Value)
    (
        'Apex Consulting Group', 'consulting', 'active',
        '1500 Broadway, New York, NY 10036',
        'David Thompson', 'dthompson@apexcg.com', '+1 (555) 456-7891',
        0.90, 0.94, 1500000, 4,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[1.3, 1.35, 1.4, 1.45, 1.48, 1.5, 1.52, 1.5, 1.5, 1.48, 1.5, 1.5],
            'risk_level', 'low',
            'last_audit_date', '2024-07-20',
            'next_renewal_date', '2025-09-30',
            'payment_terms', 'Net 60',
            'primary_contact_title', 'Managing Partner',
            'industry', 'Management Consulting',
            'employee_count', 15000,
            'founded_year', 1998,
            'certifications', ARRAY['ISO 9001'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'project', 'description', 'Q3 strategy project delivered', 'date', '2024-09-30'),
                jsonb_build_object('type', 'invoice', 'description', 'Monthly invoice paid', 'date', '2024-09-15')
            )
        ),
        NOW() - INTERVAL '2 years'
    ),

    (
        'Legal Partners LLP', 'legal', 'active',
        '400 Law Plaza, Boston, MA 02108',
        'Amanda Foster', 'afoster@legalpartners.law', '+1 (555) 567-8902',
        0.85, 0.97, 850000, 2,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.7, 0.72, 0.75, 0.78, 0.8, 0.82, 0.85, 0.86, 0.85, 0.85, 0.84, 0.85],
            'risk_level', 'low',
            'last_audit_date', '2024-06-30',
            'next_renewal_date', '2025-08-31',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Senior Partner',
            'industry', 'Legal Services',
            'employee_count', 450,
            'founded_year', 1985,
            'certifications', ARRAY['ABA Accredited'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'consultation', 'description', 'Contract review completed', 'date', '2024-09-22'),
                jsonb_build_object('type', 'retainer', 'description', 'Monthly retainer paid', 'date', '2024-09-01')
            )
        ),
        NOW() - INTERVAL '5 years'
    ),

    -- Medium Value Vendors
    (
        'Global Logistics Corp', 'logistics', 'active',
        '800 Cargo Way, Memphis, TN 38118',
        'Robert Martinez', 'rmartinez@globallogistics.com', '+1 (555) 678-9013',
        0.78, 0.88, 650000, 3,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.55, 0.57, 0.6, 0.62, 0.63, 0.65, 0.64, 0.65, 0.66, 0.65, 0.65, 0.65],
            'risk_level', 'medium',
            'last_audit_date', '2024-05-15',
            'next_renewal_date', '2025-05-31',
            'payment_terms', 'Net 45',
            'primary_contact_title', 'Account Manager',
            'industry', 'Transportation',
            'employee_count', 12000,
            'founded_year', 2002,
            'certifications', ARRAY['ISO 9001', 'C-TPAT'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'delivery', 'description', 'Quarterly shipments completed', 'date', '2024-09-30'),
                jsonb_build_object('type', 'payment', 'description', 'Invoice paid', 'date', '2024-09-10')
            )
        ),
        NOW() - INTERVAL '3 years'
    ),

    (
        'Premier Office Supplies', 'other', 'active',
        '150 Supply Lane, Chicago, IL 60601',
        'Lisa Wang', 'lwang@premieroffice.com', '+1 (555) 789-0124',
        0.82, 0.85, 420000, 2,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.38, 0.39, 0.4, 0.41, 0.42, 0.42, 0.43, 0.42, 0.42, 0.42, 0.41, 0.42],
            'risk_level', 'low',
            'last_audit_date', '2024-08-01',
            'next_renewal_date', '2025-02-28',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Regional Sales Director',
            'industry', 'Office Supplies',
            'employee_count', 3500,
            'founded_year', 1995,
            'certifications', ARRAY['Green Business Certification'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'order', 'description', 'Monthly order delivered', 'date', '2024-09-28'),
                jsonb_build_object('type', 'payment', 'description', 'Payment processed', 'date', '2024-09-15')
            )
        ),
        NOW() - INTERVAL '4 years'
    ),

    -- Pending/Lower Value Vendors
    (
        'Marketing Magic LLC', 'marketing', 'pending',
        '600 Creative Dr, Los Angeles, CA 90012',
        'Tom Anderson', 'tanderson@marketingmagic.co', '+1 (555) 890-1235',
        0.72, 0.80, 280000, 1,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.22, 0.23, 0.25, 0.26, 0.27, 0.28, 0.28, 0.29, 0.28, 0.28, 0.28, 0.28],
            'risk_level', 'medium',
            'last_audit_date', '2024-09-10',
            'next_renewal_date', '2025-01-31',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Creative Director',
            'industry', 'Marketing & Advertising',
            'employee_count', 85,
            'founded_year', 2018,
            'certifications', ARRAY['Google Partner'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'proposal', 'description', 'New campaign proposal under review', 'date', '2024-09-25'),
                jsonb_build_object('type', 'meeting', 'description', 'Kickoff meeting scheduled', 'date', '2024-09-20')
            )
        ),
        NOW() - INTERVAL '6 months'
    ),

    (
        'Facility Services Pro', 'facilities', 'active',
        '300 Building Blvd, Denver, CO 80202',
        'Maria Garcia', 'mgarcia@facilityservicespro.com', '+1 (555) 901-2346',
        0.76, 0.82, 320000, 2,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.28, 0.29, 0.3, 0.31, 0.32, 0.32, 0.33, 0.32, 0.32, 0.32, 0.32, 0.32],
            'risk_level', 'low',
            'last_audit_date', '2024-07-15',
            'next_renewal_date', '2025-07-31',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Operations Manager',
            'industry', 'Facility Management',
            'employee_count', 1200,
            'founded_year', 2005,
            'certifications', ARRAY['LEED Certified'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'service', 'description', 'Monthly maintenance completed', 'date', '2024-09-30'),
                jsonb_build_object('type', 'inspection', 'description', 'Safety inspection passed', 'date', '2024-09-15')
            )
        ),
        NOW() - INTERVAL '2 years'
    ),

    (
        'TechSupport 24/7', 'technology', 'active',
        '900 Service St, Phoenix, AZ 85001',
        'Kevin Brown', 'kbrown@techsupport247.com', '+1 (555) 012-3457',
        0.80, 0.86, 180000, 1,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.15, 0.16, 0.17, 0.17, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18],
            'risk_level', 'low',
            'last_audit_date', '2024-08-20',
            'next_renewal_date', '2025-10-31',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Support Manager',
            'industry', 'IT Support',
            'employee_count', 250,
            'founded_year', 2016,
            'certifications', ARRAY['CompTIA Certified'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'support', 'description', 'Monthly support tickets resolved', 'date', '2024-09-30'),
                jsonb_build_object('type', 'sla', 'description', 'SLA compliance maintained at 99.5%', 'date', '2024-09-30')
            )
        ),
        NOW() - INTERVAL '1 year'
    ),

    (
        'CloudBackup Solutions', 'technology', 'active',
        '750 Data Center Rd, Dallas, TX 75201',
        'Alex Kim', 'akim@cloudbackup.io', '+1 (555) 123-7891',
        0.87, 0.93, 560000, 2,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.48, 0.5, 0.52, 0.53, 0.55, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56],
            'risk_level', 'low',
            'last_audit_date', '2024-09-05',
            'next_renewal_date', '2025-11-30',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'VP of Enterprise Sales',
            'industry', 'Data Backup & Recovery',
            'employee_count', 450,
            'founded_year', 2014,
            'certifications', ARRAY['ISO 27001', 'SOC 2 Type II'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'backup', 'description', 'Backup verification completed successfully', 'date', '2024-09-29'),
                jsonb_build_object('type', 'payment', 'description', 'Quarterly payment processed', 'date', '2024-09-01')
            )
        ),
        NOW() - INTERVAL '2 years'
    ),

    (
        'PrintPro Services', 'other', 'inactive',
        '400 Print Way, Atlanta, GA 30301',
        'Nancy Wilson', 'nwilson@printpro.com', '+1 (555) 234-8902',
        0.65, 0.70, 95000, 0,
        v_enterprise_id, v_user_id, true,
        jsonb_build_object(
            'spend_trend', ARRAY[0.12, 0.11, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01],
            'risk_level', 'high',
            'last_audit_date', '2024-03-15',
            'next_renewal_date', '2024-12-31',
            'payment_terms', 'Net 30',
            'primary_contact_title', 'Sales Representative',
            'industry', 'Printing Services',
            'employee_count', 120,
            'founded_year', 2000,
            'certifications', ARRAY['FSC Certified'],
            'recent_activities', jsonb_build_array(
                jsonb_build_object('type', 'notice', 'description', 'Contract non-renewal notice sent', 'date', '2024-09-01'),
                jsonb_build_object('type', 'feedback', 'description', 'Exit interview completed', 'date', '2024-08-15')
            )
        ),
        NOW() - INTERVAL '5 years'
    );

    RAISE NOTICE 'Enhanced vendor seed data created successfully';
END $$;
