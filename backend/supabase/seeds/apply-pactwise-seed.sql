-- ================================================================
-- APPLY PACTWISE SEED DATA WITH ERROR HANDLING
-- ================================================================

-- Disable triggers temporarily
ALTER TABLE vendors DISABLE TRIGGER update_vendor_search_index;
ALTER TABLE contracts DISABLE TRIGGER ALL;

-- Execute main seed script
\i /home/dpxrk/pactwise-fork/backend/supabase/seeds/pactwise-comprehensive-seed.sql

-- Re-enable triggers
ALTER TABLE vendors ENABLE TRIGGER update_vendor_search_index;
ALTER TABLE contracts ENABLE TRIGGER ALL;

-- Update search indexes manually if needed
UPDATE vendors SET updated_at = NOW() WHERE enterprise_id = '7328ef75-2d46-4892-8562-20e450343cbd';