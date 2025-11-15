# Migration Index

This file documents all database migrations in order. Last updated: November 2025

## Status Legend

- **✅ ACTIVE** - Currently in use, core functionality
- **⚠️ SUPERSEDED** - Replaced by newer migration, kept for history
- **🗑️ DEPRECATED** - Feature removed/unused, can be archived
- **⏭️ SKIPPED** - Never applied (.skip extension)

See [MIGRATION_MAP.md](./MIGRATION_MAP.md) for detailed visual timeline and analysis.

## Migration Sequence

| Number | File | Status | Description |
|--------|------|--------|-------------|
| 001 | 001_extensions.sql | ✅ ACTIVE | PostgreSQL extensions setup |
| 002 | 002_core_tables.sql | ✅ ACTIVE | Core business entities (enterprises, users, contracts, vendors) |
| 003 | 003_ai_system_tables.sql | ✅ ACTIVE | AI agent system infrastructure |
| 004 | 004_collaboration_tables.sql | ✅ ACTIVE | Real-time collaboration features |
| 005 | 005_system_tables.sql | ✅ ACTIVE | System configuration and metadata |
| 006 | 006_rls_policies.sql | ⚠️ SUPERSEDED | Row Level Security policies (helper functions superseded by 050, 072, 081) |
| 007 | 007_functions_triggers.sql | ✅ ACTIVE | Database functions and triggers |
| 008 | 008_auth_tables.sql | ✅ ACTIVE | Authentication and authorization tables |
| 009 | 009_payment_tables.sql | ✅ ACTIVE | Payment and billing infrastructure |
| 010 | 010_advanced_ai_tables.sql | ✅ ACTIVE | Advanced AI features |
| 011 | 011_backup_and_system_tables.sql | ✅ ACTIVE | Backup and system management |
| 012 | 012_agent_logs_table.sql | ✅ ACTIVE | Agent logging infrastructure |
| 013 | 013_business_logic_functions.sql | ✅ ACTIVE | Core business logic functions |
| 014 | 014_advanced_business_functions.sql | ✅ ACTIVE | Advanced business functions |
| 015 | 015_notification_system.sql | ✅ ACTIVE | Notification system |
| 016 | 016_search_infrastructure.sql | ✅ ACTIVE | Full-text search setup |
| 017 | 017_add_distributed_tracing.sql | ✅ ACTIVE | Distributed tracing for monitoring |
| 018 | 018_workflow_system.sql | ✅ ACTIVE | Workflow management system |
| 019-026 | (Available) | - | Reserved for future migrations |
| 027-028 | [ARCHIVED] | 📦 ARCHIVED | Moved to archived_migrations/ (AI infrastructure, deleted in 076) |
| 029-030 | (Available) | - | Reserved for future migrations |
| 031 | 031_agent_tasks_performance_indexes.sql | ✅ ACTIVE | Performance indexes for agent tasks |
| 032 | [ARCHIVED] | 📦 ARCHIVED | Moved to archived_migrations/ (Agent auth, deleted in 076) |
| 033 | 033_validation_tracking.sql | ✅ ACTIVE | Input validation tracking |
| 034 | 034_memory_functions.sql | ✅ ACTIVE | Memory system functions |
| 035-039 | [ARCHIVED] | 📦 ARCHIVED | Moved to archived_migrations/ (AI systems, deleted in 076) |
| 040 | 040_enhanced_rate_limiting.sql | ✅ ACTIVE | Enhanced rate limiting |
| 041 | 041_security_monitoring.sql | ✅ ACTIVE | Security monitoring and alerting |
| 042 | 042_zero_trust_architecture.sql | ✅ ACTIVE | Zero-Trust Architecture tables |
| 043 | 043_optimization_indexes.sql | ✅ ACTIVE | Performance optimization indexes |
| 044 | 044_dashboard_stats_function.sql | ✅ ACTIVE | Dashboard statistics function |
| 045 | 045_refactor_contracts_for_3nf.sql | ✅ ACTIVE | Normalize contracts table (3NF) |
| 046 | 046_normalize_users_table.sql | ✅ ACTIVE | Normalize users table to 3NF/BCNF |
| 047 | 047_normalize_payment_methods.sql | ✅ ACTIVE | Normalize payment methods to 3NF/BCNF |
| 048 | 048_normalize_address_data.sql | ✅ ACTIVE | Centralize address data (3NF/BCNF) |
| 049 | 049_performance_optimization_indexes.sql | ✅ ACTIVE | Performance optimization indexes (some overlap with 063, 071) |
| 050 | 050_optimize_rls_policies.sql | ⚠️ SUPERSEDED | Optimize RLS policies (helper functions v2 superseded by 072, 081) |
| 051 | 051_add_table_descriptions.sql | ✅ ACTIVE | Add table descriptions |
| 052 | 052_create_storage_buckets.sql | ✅ ACTIVE | Create storage buckets |
| 053 | 053_vendor_subcategories_and_dynamic_categories.sql | ✅ ACTIVE | Add vendor subcategories and dynamic category management |
| 054 | 054_vendor_structured_address_fields.sql | ✅ ACTIVE | Add structured address fields (city, state, country) to vendors |
| 055 | 055_deep_analysis_infrastructure.sql | ✅ ACTIVE | Deep analysis infrastructure for AI-powered contract intelligence and ML services |
| 056 | 056_comprehensive_industry_benchmarks.sql | ✅ ACTIVE | Comprehensive industry benchmarks with real 2024-2025 market data |
| 057 | 057_optimize_n_plus_one_queries.sql | ✅ ACTIVE | N+1 query optimization |
| 058 | 058_contract_auto_status_detection.sql | ✅ ACTIVE | Automatic contract status detection based on completeness and approvals |
| 059 | 059_optimize_contract_status_detection.sql | ✅ ACTIVE | Performance optimizations and security improvements for auto-status detection |
| 060 | 060_vendor_contract_relationship_enforcement.sql | ✅ ACTIVE | Enforce vendor_id NOT NULL, add materialized view for vendor metrics optimization |
| 061 | 061_batch_upload_system.sql | ✅ ACTIVE | Batch upload system for contracts and vendors with intelligent vendor matching |
| 062-066 | (Available) | - | Reserved for future migrations |
| 067 | 067_rfq_rfp_and_sourcing_system.sql | ✅ ACTIVE | RFQ/RFP management and intelligent supplier sourcing system |
| 068 | [ARCHIVED] | 📦 ARCHIVED | Moved to archived_migrations/ (duplicate of 067, was skipped) |
| 069 | 069_agent_memory_system.sql | ✅ ACTIVE | Agent memory system (circular deps fixed in 081) |
| 070 | 070_vendor_analytics_functions.sql | ✅ ACTIVE | Vendor analytics functions (circular deps fixed in 081) |
| 071 | 071_performance_optimization_indexes_and_caching.sql | ✅ ACTIVE | Comprehensive performance optimization (some overlap with 049, 063) |
| 072 | 072_optimize_rls_policies_for_performance.sql | ⚠️ SUPERSEDED | RLS optimization (helper functions v3 superseded by 081) |
| 073 | 073_agent_tracking_fields.sql | ✅ ACTIVE | Add tracking and metrics fields to agents and agent_system tables |
| 074 | 074_initialize_default_agents.sql | ✅ ACTIVE | Initialize default agent system and all 17 agents for enterprises |
| 075 | 075_comprehensive_optimizations.sql | ✅ ACTIVE | Comprehensive performance and security optimizations |
| 076 | 076_email_notification_triggers.sql | ✅ ACTIVE | Email notification system (also deleted 168 empty AI tables) |
| 077 | 077_fix_users_rls_circular_dependency.sql | ✅ ACTIVE | Fix circular dependency in users table RLS policies for auth |
| 078 | 078_automate_pending_analysis_workflow.sql | ✅ ACTIVE | Automate pending_analysis workflow: Upload → pending_analysis → pending_review |
| 079 | 079_fix_vendor_list_n_plus_one.sql | ✅ ACTIVE | Fix N+1 query in vendor list |
| 080 | 080_batch_update_expired_contracts.sql | ✅ ACTIVE | Batch update expired contracts |
| 081 | 081_comprehensive_circular_dependency_fixes.sql | ✅ ACTIVE | **COMPREHENSIVE FIX** - All circular deps + helper functions v4 (authoritative) |
| 082 | 082_add_donna_terminal_stats.sql | ✅ ACTIVE | Add Donna Terminal statistics to dashboard stats function |

## Migration Policy

1. **Naming Convention**: `NNN_description_of_change.sql` where NNN is a 3-digit number
2. **Sequential Numbering**: Always use the next available number
3. **No Duplicates**: Check this index before creating new migrations
4. **Descriptive Names**: Use clear, descriptive names for the change
5. **Atomic Changes**: Each migration should be a single logical change

## Creating New Migrations

```bash
# Find next available number
ls supabase/migrations/*.sql | tail -1

# Create new migration
supabase migration new your_migration_name

# Update this index file
```

## Testing Migrations

```bash
# Test full migration sequence
supabase db reset

# Test specific migration
supabase migration up --to-version NNN
```

---

## Migration Summary

### Total Active Migrations: 71

| Status | Count | Description |
|--------|-------|-------------|
| ✅ ACTIVE | 68 | Currently in use |
| ⚠️ SUPERSEDED | 3 | Replaced but kept for history (006, 050, 072) |
| 📦 ARCHIVED | 11 | Moved to archived_migrations/ (027-028, 032, 035-039, 043, 068, 076) |

### Archived Migrations: 11

See `/supabase/archived_migrations/README.md` for details on archived migrations.

### Key Migrations

**Helper Functions (MUST USE v4):**
- ⚠️ v1: Migration 006 (superseded)
- ⚠️ v2: Migration 050 (superseded)
- ⚠️ v3: Migration 072 (superseded)
- ✅ **v4: Migration 081 (AUTHORITATIVE - use this!)**

**Circular Dependency Fixes:**
- 077: Users table auth_id access
- **081: Comprehensive fix for all 11+ tables**

**Performance Optimizations:**
- 049, 063, 071: Index optimizations (some overlap)
- 057: N+1 query fixes

**Major Features:**
- 002: Core tables
- 013, 014: Business logic
- 067: RFQ/RFP system
- 069: Agent memory system
- 076: Email notifications + cleanup (deleted 168 tables)

### Quick Stats

- **Total Lines:** ~22,000 lines of SQL
- **Total Size:** ~1.78 MB
- **Active Tables:** ~52 (after 076 cleanup)
- **Deleted Tables:** 168 (in migration 076)
- **Helper Functions:** 5 (in migration 081)

### Important Notes

1. **DO NOT** redefine helper functions - use migration 081 versions
2. Migration 081 fixes ALL known circular dependencies
3. Migrations 027-039 created AI tables that were deleted in 076
4. Migration 068 is skipped (.skip) and can be removed
5. See [MIGRATION_MAP.md](./MIGRATION_MAP.md) for detailed analysis

---