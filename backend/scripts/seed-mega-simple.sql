-- MEGA SEED: 50 vendors + 200+ contracts
-- Run with: cat seed-mega-simple.sql | docker exec -i supabase_db_pactwise psql -U postgres -d postgres

\set enterprise_id 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c'
\set demo_user_id 'd0a093b6-a806-4295-a63d-3358fc82a937'

BEGIN;

-- Insert 50 vendors
INSERT INTO vendors (name, category, status, website, performance_score, compliance_score, total_contract_value, enterprise_id, created_by, metadata) VALUES
('Microsoft Corporation', 'technology', 'active', 'https://microsoft.com', 4.8, 4.9, 350000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Amazon Web Services', 'technology', 'active', 'https://aws.amazon.com', 4.9, 4.8, 420000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Google Cloud Platform', 'technology', 'active', 'https://cloud.google.com', 4.7, 4.7, 280000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Salesforce Inc', 'technology', 'active', 'https://salesforce.com', 4.6, 4.8, 250000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Oracle Corporation', 'technology', 'active', 'https://oracle.com', 4.4, 4.5, 180000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('SAP America', 'technology', 'active', 'https://sap.com', 4.5, 4.6, 220000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('IBM Corporation', 'technology', 'active', 'https://ibm.com', 4.6, 4.7, 195000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Snowflake Inc', 'technology', 'active', 'https://snowflake.com', 4.8, 4.9, 145000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Databricks Inc', 'technology', 'active', 'https://databricks.com', 4.7, 4.6, 125000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('MongoDB Inc', 'technology', 'active', 'https://mongodb.com', 4.6, 4.5, 95000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Atlassian Corporation', 'technology', 'active', 'https://atlassian.com', 4.7, 4.7, 110000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('ServiceNow Inc', 'technology', 'active', 'https://servicenow.com', 4.5, 4.6, 165000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Workday Inc', 'hr', 'active', 'https://workday.com', 4.6, 4.8, 200000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Adobe Systems', 'technology', 'active', 'https://adobe.com', 4.7, 4.6, 85000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Cisco Systems', 'technology', 'active', 'https://cisco.com', 4.5, 4.7, 175000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Dell Technologies', 'technology', 'active', 'https://dell.com', 4.4, 4.5, 160000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('HP Enterprise', 'technology', 'active', 'https://hpe.com', 4.3, 4.4, 140000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('VMware Inc', 'technology', 'active', 'https://vmware.com', 4.6, 4.7, 130000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Red Hat Inc', 'technology', 'active', 'https://redhat.com', 4.7, 4.8, 115000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Palo Alto Networks', 'technology', 'active', 'https://paloaltonetworks.com', 4.8, 4.9, 185000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Slack Technologies', 'technology', 'active', 'https://slack.com', 4.8, 4.7, 75000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Zoom Video', 'technology', 'active', 'https://zoom.us', 4.7, 4.6, 65000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Dropbox Inc', 'technology', 'active', 'https://dropbox.com', 4.5, 4.6, 55000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Box Inc', 'technology', 'active', 'https://box.com', 4.6, 4.7, 68000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('DocuSign Inc', 'legal', 'active', 'https://docusign.com', 4.7, 4.8, 45000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('HubSpot Inc', 'marketing', 'active', 'https://hubspot.com', 4.7, 4.6, 95000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Mailchimp', 'marketing', 'active', 'https://mailchimp.com', 4.6, 4.6, 45000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Zendesk Inc', 'technology', 'active', 'https://zendesk.com', 4.6, 4.6, 78000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Stripe Inc', 'finance', 'active', 'https://stripe.com', 4.9, 4.9, 185000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Plaid Inc', 'finance', 'active', 'https://plaid.com', 4.7, 4.8, 72000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Deloitte Consulting', 'consulting', 'active', 'https://deloitte.com', 4.5, 4.7, 450000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('McKinsey & Company', 'consulting', 'active', 'https://mckinsey.com', 4.7, 4.8, 380000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Boston Consulting', 'consulting', 'active', 'https://bcg.com', 4.6, 4.7, 320000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Accenture', 'consulting', 'active', 'https://accenture.com', 4.5, 4.6, 290000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('PwC Consulting', 'consulting', 'active', 'https://pwc.com', 4.6, 4.7, 310000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('EY Advisory', 'consulting', 'active', 'https://ey.com', 4.5, 4.6, 275000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('KPMG Advisory', 'consulting', 'active', 'https://kpmg.com', 4.4, 4.5, 265000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Bain & Company', 'consulting', 'active', 'https://bain.com', 4.7, 4.7, 295000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Grant Thornton', 'consulting', 'active', 'https://grantthornton.com', 4.3, 4.4, 185000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Cushman & Wakefield', 'facilities', 'active', 'https://cushmanwakefield.com', 4.4, 4.5, 240000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('CBRE Group', 'facilities', 'active', 'https://cbre.com', 4.5, 4.6, 280000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('JLL', 'facilities', 'active', 'https://jll.com', 4.4, 4.5, 220000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('FedEx Corporation', 'logistics', 'active', 'https://fedex.com', 4.5, 4.6, 125000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('UPS', 'logistics', 'active', 'https://ups.com', 4.6, 4.7, 135000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('DHL Express', 'logistics', 'active', 'https://dhl.com', 4.4, 4.5, 98000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('ADP Payroll', 'hr', 'active', 'https://adp.com', 4.6, 4.8, 180000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Paychex Inc', 'hr', 'active', 'https://paychex.com', 4.5, 4.6, 145000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Gusto', 'hr', 'active', 'https://gusto.com', 4.7, 4.7, 95000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('BambooHR', 'hr', 'active', 'https://bamboohr.com', 4.6, 4.6, 68000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb),
('Thomson Reuters', 'legal', 'active', 'https://thomsonreuters.com', 4.5, 4.8, 125000, :'enterprise_id', :'demo_user_id', '{"seeded": true}'::jsonb);

-- Generate 4 contracts per vendor (200 total)
DO $$
DECLARE
  v_vendor RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_value NUMERIC;
  v_types TEXT[] := ARRAY['SaaS Subscription', 'Master Services Agreement', 'Software License', 'Professional Services'];
  v_statuses contract_status[] := ARRAY['active'::contract_status, 'active'::contract_status, 'active'::contract_status, 'pending_review'::contract_status];
  i INT;
BEGIN
  FOR v_vendor IN SELECT id, name FROM vendors WHERE enterprise_id = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c' AND metadata->>'seeded' = 'true' LOOP
    FOR i IN 1..4 LOOP
      v_start_date := CURRENT_DATE - (RANDOM() * 365)::INT;
      v_end_date := v_start_date + INTERVAL '12 months' + (RANDOM() * 730)::INT * INTERVAL '1 day';
      v_value := (10000 + RANDOM() * 150000)::NUMERIC(15,2);

      INSERT INTO contracts (
        title,
        vendor_id,
        contract_type,
        status,
        value,
        start_date,
        end_date,
        is_auto_renew,
        notes,
        enterprise_id,
        owner_id,
        created_by,
        metadata,
        analysis_status
      ) VALUES (
        v_types[((i-1) % 4) + 1] || ' - ' || v_vendor.name,
        v_vendor.id,
        v_types[((i-1) % 4) + 1],
        v_statuses[((i-1) % 4) + 1],
        v_value,
        v_start_date,
        v_end_date,
        (i % 2 = 0),
        'Auto-generated demo contract with realistic terms',
        'f2e359ed-8950-4afa-9cf4-24a94c7caa7c',
        'd0a093b6-a806-4295-a63d-3358fc82a937',
        'd0a093b6-a806-4295-a63d-3358fc82a937',
        '{"seeded": true}'::jsonb,
        'completed'
      );
    END LOOP;
  END LOOP;
END $$;

-- Update vendor stats
UPDATE vendors v
SET
  active_contracts = (SELECT COUNT(*) FROM contracts WHERE vendor_id = v.id AND status = 'active'),
  total_contract_value = (SELECT COALESCE(SUM(value), 0) FROM contracts WHERE vendor_id = v.id AND status = 'active')
WHERE enterprise_id = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c';

COMMIT;

-- Show summary
SELECT
  (SELECT COUNT(*) FROM vendors WHERE enterprise_id = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c' AND metadata->>'seeded' = 'true') as vendors_created,
  (SELECT COUNT(*) FROM contracts WHERE enterprise_id = 'f2e359ed-8950-4afa-9cf4-24a94c7caa7c' AND metadata->>'seeded' = 'true') as contracts_created;
