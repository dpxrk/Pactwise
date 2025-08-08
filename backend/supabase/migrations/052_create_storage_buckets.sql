-- Create Storage Buckets for file management
-- This migration creates the necessary storage buckets for the application

-- Enable storage schema if not already enabled
CREATE SCHEMA IF NOT EXISTS storage;

-- Function to safely create buckets
CREATE OR REPLACE FUNCTION create_storage_bucket(
    bucket_name text,
    is_public boolean DEFAULT false,
    file_size_limit bigint DEFAULT 52428800, -- 50MB default
    allowed_mime_types text[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Check if bucket already exists
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = bucket_name
    ) THEN
        INSERT INTO storage.buckets (
            id,
            name,
            public,
            file_size_limit,
            allowed_mime_types,
            created_at,
            updated_at
        ) VALUES (
            bucket_name,
            bucket_name,
            is_public,
            file_size_limit,
            allowed_mime_types,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created storage bucket: %', bucket_name;
    ELSE
        RAISE NOTICE 'Storage bucket % already exists', bucket_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Contracts bucket - Private, only accessible to authorized users
SELECT create_storage_bucket(
    'contracts',
    false,
    104857600, -- 100MB limit for contract documents
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Vendor documents bucket - Private, for vendor certificates and compliance docs
SELECT create_storage_bucket(
    'vendor-documents',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- User avatars bucket - Public for profile pictures
SELECT create_storage_bucket(
    'avatars',
    true,
    5242880, -- 5MB limit for avatars
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Company logos bucket - Public for enterprise branding
SELECT create_storage_bucket(
    'company-logos',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
);

-- Attachments bucket - Private, general purpose file storage
SELECT create_storage_bucket(
    'attachments',
    false,
    52428800, -- 50MB limit
    NULL -- Allow all file types
);

-- Document templates bucket - Private, for contract templates
SELECT create_storage_bucket(
    'templates',
    false,
    20971520, -- 20MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Reports bucket - Private, for generated reports and exports
SELECT create_storage_bucket(
    'reports',
    false,
    104857600, -- 100MB limit for large reports
    ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json']
);

-- ============================================================================
-- STORAGE POLICIES (RLS for buckets)
-- ============================================================================

-- Contracts bucket - authenticated users only
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contracts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete contracts"
ON storage.objects FOR DELETE
USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

-- Vendor documents - authenticated users only
CREATE POLICY "Authenticated users can manage vendor documents"
ON storage.objects FOR ALL
USING (bucket_id = 'vendor-documents' AND auth.uid() IS NOT NULL);

-- Avatars - public read, owner write
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND 
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND 
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Company logos - public read, authenticated write
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can manage company logos"
ON storage.objects FOR ALL
USING (bucket_id = 'company-logos' AND auth.uid() IS NOT NULL);

-- Attachments - authenticated users only
CREATE POLICY "Authenticated users can manage attachments"
ON storage.objects FOR ALL
USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

-- Templates - authenticated users only
CREATE POLICY "Authenticated users can manage templates"
ON storage.objects FOR ALL
USING (bucket_id = 'templates' AND auth.uid() IS NOT NULL);

-- Reports - authenticated users can read, system can write
CREATE POLICY "Authenticated users can view reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reports' AND auth.uid() IS NOT NULL);

-- Clean up helper function
DROP FUNCTION IF EXISTS create_storage_bucket(text, boolean, bigint, text[]);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Storage buckets created successfully with RLS policies';
END $$;