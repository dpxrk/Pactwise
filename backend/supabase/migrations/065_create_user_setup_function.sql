-- Create a function to handle initial user setup
-- This function bypasses RLS to create the enterprise and user profile in one transaction

CREATE OR REPLACE FUNCTION public.setup_new_user(
  p_auth_id UUID,
  p_email TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  user_id UUID,
  enterprise_id UUID,
  user_role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_enterprise_id UUID;
  v_user_id UUID;
  v_domain TEXT;
  v_is_public_domain BOOLEAN;
  v_enterprise_name TEXT;
BEGIN
  -- Extract domain from email
  v_domain := split_part(p_email, '@', 2);
  
  -- Check if it's a public email domain
  v_is_public_domain := v_domain IN (
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
    'yandex.com', 'zoho.com'
  );
  
  -- Generate enterprise name
  IF v_is_public_domain THEN
    v_enterprise_name := split_part(p_email, '@', 1) || '''s Workspace';
  ELSE
    -- Use domain name as enterprise name
    v_enterprise_name := initcap(replace(split_part(v_domain, '.', 1), '-', ' ')) || ' Organization';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = p_auth_id;
  
  IF v_user_id IS NOT NULL THEN
    -- User already exists, return their info
    SELECT u.id, u.enterprise_id, u.role
    INTO v_user_id, v_enterprise_id, v_domain -- using v_domain as temp var
    FROM users u
    WHERE u.id = v_user_id;
    
    RETURN QUERY
    SELECT v_user_id, v_enterprise_id, v_domain::user_role;
    RETURN;
  END IF;
  
  -- Check if there's an existing enterprise for this domain (non-public only)
  IF NOT v_is_public_domain THEN
    SELECT id INTO v_enterprise_id
    FROM enterprises
    WHERE domain = v_domain
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;
  
  -- If no enterprise exists, create one
  IF v_enterprise_id IS NULL THEN
    v_enterprise_id := gen_random_uuid();
    
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
      v_enterprise_id,
      v_enterprise_name,
      CASE WHEN v_is_public_domain THEN NULL ELSE v_domain END,
      'Technology',
      'Small',
      0,
      'Contract Management',
      jsonb_build_object(
        'demo', true,
        'is_personal', v_is_public_domain
      ),
      jsonb_build_object(
        'created_via', 'auto_signup',
        'created_at', now()
      ) || p_metadata
    );
  END IF;
  
  -- Create user profile
  INSERT INTO users (
    auth_id,
    email,
    first_name,
    last_name,
    enterprise_id,
    role
  ) VALUES (
    p_auth_id,
    p_email,
    p_first_name,
    p_last_name,
    v_enterprise_id,
    'owner' -- First user in an enterprise is always the owner
  )
  RETURNING id INTO v_user_id;
  
  -- Return the created user info
  RETURN QUERY
  SELECT v_user_id, v_enterprise_id, 'owner'::user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_new_user TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.setup_new_user IS 'Sets up a new user by creating their enterprise (if needed) and user profile. Bypasses RLS for initial setup.';