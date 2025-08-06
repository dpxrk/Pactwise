# Migration Index

This file documents all database migrations in order. Last updated: January 2025

## Migration Sequence

| Number | File | Description |
|--------|------|-------------|
| 001 | 001_extensions.sql | PostgreSQL extensions setup |
| 002 | 002_core_tables.sql | Core business entities (enterprises, users, contracts, vendors) |
| 003 | 003_ai_system_tables.sql | AI agent system infrastructure |
| 004 | 004_collaboration_tables.sql | Real-time collaboration features |
| 005 | 005_system_tables.sql | System configuration and metadata |
| 006 | 006_rls_policies.sql | Row Level Security policies |
| 007 | 007_functions_triggers.sql | Database functions and triggers |
| 008 | 008_auth_tables.sql | Authentication and authorization tables |
| 009 | 009_payment_tables.sql | Payment and billing infrastructure |
| 010 | 010_advanced_ai_tables.sql | Advanced AI features |
| 011 | 011_backup_and_system_tables.sql | Backup and system management |
| 012 | 012_agent_logs_table.sql | Agent logging infrastructure |
| 013 | 013_business_logic_functions.sql | Core business logic functions |
| 014 | 014_advanced_business_functions.sql | Advanced business functions |
| 015 | 015_notification_system.sql | Notification system |
| 016 | 016_search_infrastructure.sql | Full-text search setup |
| 017 | 017_add_distributed_tracing.sql | Distributed tracing for monitoring |
| 018 | 018_workflow_system.sql | Workflow management system |
| 019-026 | (Available) | Reserved for future migrations |
| 027 | 027_swarm_intelligence_system.sql | Swarm intelligence AI features |
| 028 | 028_continual_learning_system.sql | Continual learning infrastructure |
| 029-030 | (Available) | Reserved for future migrations |
| 031 | 031_agent_tasks_performance_indexes.sql | Performance indexes for agent tasks |
| 032 | 032_agent_authentication.sql | Agent authentication system |
| 033 | 033_validation_tracking.sql | Input validation tracking |
| 034 | 034_memory_functions.sql | Memory system functions |
| 035 | 035_donna_system_tables.sql | Donna AI global learning system |
| 036 | 036_metacognitive_system.sql | Metacognitive reasoning features |
| 037 | 037_causal_reasoning_system.sql | Causal reasoning infrastructure |
| 038 | 038_theory_of_mind_system.sql | Theory of mind AI features |
| 039 | 039_quantum_optimization_system.sql | Quantum optimization algorithms |
| 040 | 040_enhanced_rate_limiting.sql | Enhanced rate limiting |
| 041 | 041_security_monitoring.sql | Security monitoring and alerting |
| 042 | 042_zero_trust_architecture.sql | Zero-Trust Architecture tables |
| 043 | 20250729234432_043_optimization_indexes.sql | Performance optimization indexes |
| 044 | 044_refactor_vendors_for_3nf.sql | Normalize vendors table (3NF) |
| 045 | 045_refactor_contracts_for_3nf.sql | Normalize contracts table (3NF) |
| 046 | 046_normalize_users_table.sql | Normalize users table to 3NF/BCNF |
| 047 | 047_normalize_payment_methods.sql | Normalize payment methods to 3NF/BCNF |
| 048 | 048_normalize_address_data.sql | Centralize address data (3NF/BCNF) |
| 049 | 049_performance_optimization_indexes.sql | Performance optimization indexes |
| 050 | 050_optimize_rls_policies.sql | Optimize RLS policies for performance |

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