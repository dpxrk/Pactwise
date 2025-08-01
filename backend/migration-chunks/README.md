# Migration Chunks

These files contain the initial database setup broken into manageable chunks for manual deployment.
They are NOT part of the automatic migration system.

## Purpose

The migration chunks are designed for initial setup when:
1. Setting up a new Supabase instance manually
2. Debugging individual migration components
3. Running migrations in the Supabase SQL Editor UI

## Files

- `01-foundation.sql` - Extensions and basic setup
- `02-core-tables.sql` - Core business entities
- `03-support-tables-indexes.sql` - Supporting tables and indexes
- `03.5-additional-tables.sql` - Additional tables
- `04-ai-agent-system.sql` - AI agent infrastructure
- `05-rls-security-minimal.sql` - Row Level Security policies
- `06-basic-functions.sql` - Database functions

## Usage

These should be run in order if setting up manually. For automatic migrations, use the files in `supabase/migrations/` instead.