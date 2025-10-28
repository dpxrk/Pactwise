-- Seed demo data for demo@pactwise.com
-- 25 Vendors + 100 Contracts

SET search_path TO public;

-- Insert 25 vendors
INSERT INTO vendors (id, name, category, status, website, performance_score, compliance_score, total_contract_value, enterprise_id, created_by, metadata, created_at)
VALUES
  (gen_random_uuid(), 'Microsoft Corporation', 'technology', 'active', 'https://microsoft.com', 4.8, 4.75, 250000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Amazon Web Services', 'technology', 'active', 'https://aws.amazon.com', 4.7, 4.9, 180000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Salesforce Inc', 'technology', 'active', 'https://salesforce.com', 4.6, 4.6, 150000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Google Cloud Platform', 'technology', 'active', 'https://cloud.google.com', 4.7, 4.8, 140000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Oracle Corporation', 'technology', 'active', 'https://oracle.com', 4.3, 4.4, 120000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'SAP America Inc', 'technology', 'active', 'https://sap.com', 4.4, 4.5, 110000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'IBM Corporation', 'technology', 'active', 'https://ibm.com', 4.5, 4.55, 95000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Atlassian Corporation', 'technology', 'active', 'https://atlassian.com', 4.6, 4.65, 75000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Adobe Systems Inc', 'marketing', 'active', 'https://adobe.com', 4.7, 4.7, 68000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Cisco Systems Inc', 'technology', 'active', 'https://cisco.com', 4.5, 4.45, 85000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Dell Technologies', 'technology', 'active', 'https://dell.com', 4.4, 4.35, 92000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'HP Inc', 'technology', 'active', 'https://hp.com', 4.3, 4.3, 71000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Zoom Video Communications', 'technology', 'active', 'https://zoom.us', 4.6, 4.6, 45000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Slack Technologies', 'technology', 'active', 'https://slack.com', 4.7, 4.75, 38000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'DocuSign Inc', 'legal', 'active', 'https://docusign.com', 4.5, 4.55, 32000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Workday Inc', 'hr', 'active', 'https://workday.com', 4.6, 4.65, 125000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'ServiceNow Inc', 'technology', 'active', 'https://servicenow.com', 4.5, 4.5, 98000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Snowflake Inc', 'technology', 'active', 'https://snowflake.com', 4.7, 4.8, 87000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Datadog Inc', 'technology', 'active', 'https://datadog.com', 4.6, 4.7, 54000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'MongoDB Inc', 'technology', 'active', 'https://mongodb.com', 4.5, 4.45, 62000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Twilio Inc', 'technology', 'active', 'https://twilio.com', 4.4, 4.4, 48000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Stripe Inc', 'finance', 'active', 'https://stripe.com', 4.8, 4.9, 156000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'HubSpot Inc', 'marketing', 'active', 'https://hubspot.com', 4.6, 4.6, 72000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Zendesk Inc', 'technology', 'active', 'https://zendesk.com', 4.5, 4.5, 51000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW()),
  (gen_random_uuid(), 'Dropbox Inc', 'technology', 'active', 'https://dropbox.com', 4.4, 4.35, 39000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '{"protected": true}'::jsonb, NOW());

-- Insert 100 contracts (using vendor IDs from above)
DO $$
DECLARE
  v_vendor_ids UUID[];
  v_vendor_id UUID;
  v_contract_types TEXT[] := ARRAY['SaaS Subscription', 'Master Services Agreement', 'Software License', 'Professional Services', 'Data Processing Agreement'];
  v_statuses TEXT[] := ARRAY['active', 'active', 'active', 'draft', 'pending_review'];
  v_start_date DATE;
  v_end_date DATE;
  i INT;
BEGIN
  -- Get all vendor IDs
  SELECT ARRAY_AGG(id) INTO v_vendor_ids FROM vendors WHERE enterprise_id = 'a0000000-0000-0000-0000-000000000001';

  -- Generate 100 contracts
  FOR i IN 1..100 LOOP
    v_vendor_id := v_vendor_ids[(i % array_length(v_vendor_ids, 1)) + 1];
    v_start_date := CURRENT_DATE - (RANDOM() * 365)::INT;
    v_end_date := v_start_date + INTERVAL '1 year' + (RANDOM() * 730)::INT * INTERVAL '1 day';

    INSERT INTO contracts (
      title,
      status,
      contract_type,
      start_date,
      end_date,
      value,
      is_auto_renew,
      notes,
      vendor_id,
      enterprise_id,
      owner_id,
      created_by,
      metadata,
      analysis_status,
      created_at
    ) VALUES (
      v_contract_types[(i % 5) + 1] || ' - ' || i,
      v_statuses[(i % 5) + 1]::contract_status,
      v_contract_types[(i % 5) + 1],
      v_start_date,
      v_end_date,
      (10000 + RANDOM() * 200000)::DECIMAL(15,2),
      (i % 3 = 0),
      'This is a demo contract with standard terms including indemnification, limitation of liability, and GDPR/CCPA compliance clauses.',
      v_vendor_id,
      'a0000000-0000-0000-0000-000000000001',
      'b0000000-0000-0000-0000-000000000001',
      'b0000000-0000-0000-0000-000000000001',
      '{"protected": true}'::jsonb,
      'completed',
      v_start_date
    );
  END LOOP;
END $$;

-- Update vendor stats
UPDATE vendors v
SET
  active_contracts = (SELECT COUNT(*) FROM contracts WHERE vendor_id = v.id AND status = 'active'),
  total_contract_value = (SELECT COALESCE(SUM(value), 0) FROM contracts WHERE vendor_id = v.id AND status = 'active')
WHERE enterprise_id = 'a0000000-0000-0000-0000-000000000001';

SELECT
  (SELECT COUNT(*) FROM vendors WHERE enterprise_id = 'a0000000-0000-0000-0000-000000000001') as vendors_created,
  (SELECT COUNT(*) FROM contracts WHERE enterprise_id = 'a0000000-0000-0000-0000-000000000001') as contracts_created;
