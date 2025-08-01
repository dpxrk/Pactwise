-- ========================================
-- PACTWISE FOUNDATION MIGRATION (Part 1 of 6)
-- Run this in Supabase SQL Editor first
-- ========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'user', 'viewer');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_analysis', 'pending_review', 'active', 'expired', 'terminated', 'archived');
CREATE TYPE vendor_category AS ENUM ('technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other');
CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE budget_type AS ENUM ('annual', 'quarterly', 'monthly', 'project', 'department');
CREATE TYPE budget_status AS ENUM ('healthy', 'at_risk', 'exceeded', 'closed');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE approval_type AS ENUM ('initial_review', 'legal_review', 'finance_review', 'final_approval', 'renewal_approval');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated');

-- Create schemas for organization
-- Note: 'auth' schema is managed by Supabase, don't create it
CREATE SCHEMA IF NOT EXISTS private;

-- Helper function for generating nanoid
CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 21)
RETURNS text AS $$
DECLARE
  id text := '';
  i int := 0;
  urlAlphabet char(64) := 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  bytes bytea := gen_random_bytes(size);
  byte int;
  pos int;
BEGIN
  WHILE i < size LOOP
    byte := get_byte(bytes, i);
    pos := (byte & 63) + 1;
    id := id || substr(urlAlphabet, pos, 1);
    i = i + 1;
  END LOOP;
  RETURN id;
END
$$ LANGUAGE plpgsql VOLATILE;