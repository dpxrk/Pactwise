-- =============================================
-- Supabase Authentication Setup for Pactwise
-- =============================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Create custom user profile table
-- This extends the auth.users table with additional fields
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  enterprise_id UUID,
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'user', 'viewer')) DEFAULT 'user',
  department TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create enterprises table
CREATE TABLE IF NOT EXISTS public.enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add foreign key constraint for enterprise_id
ALTER TABLE public.users 
ADD CONSTRAINT users_enterprise_id_fkey 
FOREIGN KEY (enterprise_id) 
REFERENCES public.enterprises(id) 
ON DELETE SET NULL;

-- 4. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enterprises_updated_at 
  BEFORE UPDATE ON public.enterprises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users in same enterprise can view each other
CREATE POLICY "Users can view same enterprise users" 
  ON public.users FOR SELECT 
  USING (
    enterprise_id IS NOT NULL AND
    enterprise_id IN (
      SELECT enterprise_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Enterprises table policies
-- Users can view their enterprise
CREATE POLICY "Users can view own enterprise" 
  ON public.enterprises FOR SELECT 
  USING (
    id IN (
      SELECT enterprise_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Only admins and owners can update enterprise
CREATE POLICY "Admins can update enterprise" 
  ON public.enterprises FOR UPDATE 
  USING (
    id IN (
      SELECT enterprise_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    id IN (
      SELECT enterprise_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- Helper Functions for Application
-- =============================================

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS public.users AS $$
BEGIN
  RETURN (
    SELECT * FROM public.users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy JSONB := '{
    "viewer": 1,
    "user": 2,
    "manager": 3,
    "admin": 4,
    "owner": 5
  }'::JSONB;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (role_hierarchy->>user_role)::INT >= (role_hierarchy->>required_role)::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Create a sample enterprise (uncomment to use)
-- INSERT INTO public.enterprises (name, domain, subscription_tier)
-- VALUES ('Demo Company', 'demo.com', 'free');

-- =============================================
-- Storage Buckets for Files
-- =============================================

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_enterprise_id ON public.users(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_enterprises_domain ON public.enterprises(domain);

-- =============================================
-- Auth Configuration Notes
-- =============================================
-- After running this SQL, configure the following in Supabase Dashboard:
-- 
-- 1. Authentication > Settings:
--    - Enable Email authentication
--    - Set Site URL to: http://localhost:3000
--    - Add Redirect URLs:
--      - http://localhost:3000/auth/callback
--      - http://localhost:3000/dashboard
--      - http://localhost:3000/auth/reset-password
--
-- 2. Authentication > Email Templates:
--    - Customize confirmation, recovery, and invite emails
--    - Add your brand styling
--
-- 3. Authentication > Providers (Optional):
--    - Enable Google OAuth
--    - Enable GitHub OAuth
--    - Configure OAuth redirect URLs
--
-- 4. Settings > API:
--    - Note your project URL and anon key for .env.local