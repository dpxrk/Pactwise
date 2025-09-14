-- Fix enterprise creation by adding INSERT policy
-- This allows authenticated users to create enterprises during signup

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can create enterprises" ON enterprises;
DROP POLICY IF EXISTS "Users can insert their own enterprise" ON enterprises;

-- Create INSERT policy for enterprises
-- This allows authenticated users to create an enterprise
CREATE POLICY "Authenticated users can create enterprises" ON enterprises
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Also ensure users can create their profile with the enterprise they just created
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;

CREATE POLICY "Authenticated users can create their profile" ON users
  FOR INSERT
  WITH CHECK (
    auth_id = auth.uid()
  );

-- Add a comment explaining the policy
COMMENT ON POLICY "Authenticated users can create enterprises" ON enterprises IS 
  'Allows authenticated users to create an enterprise during signup. The user will be automatically assigned as owner through the user profile creation.';

COMMENT ON POLICY "Authenticated users can create their profile" ON users IS 
  'Allows authenticated users to create their own user profile during signup process.';