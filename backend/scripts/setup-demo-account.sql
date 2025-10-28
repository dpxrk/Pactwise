-- Setup Demo Account Script
-- This script creates a complete demo environment for demo@pactwise.com

-- First, clean up any existing demo data
DELETE FROM users WHERE email = 'demo@pactwise.com';
DELETE FROM enterprises WHERE domain = 'pactwise.com';

-- Create the enterprise
INSERT INTO enterprises (
  id,
  name,
  domain,
  industry,
  size,
  contract_volume,
  primary_use_case,
  settings,
  metadata
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Pactwise Demo Organization',
  'pactwise.com',
  'Technology',
  'Enterprise',
  0,
  'Contract Management',
  '{"demo": true, "is_personal": false}'::jsonb,
  '{"created_via": "demo_setup", "protected": true}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain;

-- Get the auth user ID for demo@pactwise.com
DO $$
DECLARE
  v_auth_id uuid;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'demo@pactwise.com';

  IF v_auth_id IS NOT NULL THEN
    -- Create/update the user profile
    INSERT INTO users (
      id,
      auth_id,
      email,
      first_name,
      last_name,
      enterprise_id,
      role,
      department,
      title
    ) VALUES (
      'b0000000-0000-0000-0000-000000000001'::uuid,
      v_auth_id,
      'demo@pactwise.com',
      'Demo',
      'User',
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'owner',
      'Administration',
      'System Administrator'
    ) ON CONFLICT (auth_id) DO UPDATE SET
      enterprise_id = EXCLUDED.enterprise_id,
      role = EXCLUDED.role;

    RAISE NOTICE 'Demo user created successfully';
  ELSE
    RAISE NOTICE 'Auth user demo@pactwise.com not found - needs to be created via signup first';
  END IF;
END $$;
