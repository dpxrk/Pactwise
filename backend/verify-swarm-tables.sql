-- Swarm Orchestration Table Verification Script
-- Run this in Supabase Studio SQL Editor or via psql

-- ==================================================
-- 1. Check if swarm tables exist
-- ==================================================

SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE 'agent_%'
ORDER BY tablename;

-- Expected output:
-- agent_performance_history
-- agent_pheromones
-- agent_swarm_patterns


-- ==================================================
-- 2. Table schema verification
-- ==================================================

-- Check agent_performance_history structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'agent_performance_history'
ORDER BY ordinal_position;

-- Check agent_pheromones structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'agent_pheromones'
ORDER BY ordinal_position;

-- Check agent_swarm_patterns structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'agent_swarm_patterns'
ORDER BY ordinal_position;


-- ==================================================
-- 3. Check RLS policies
-- ==================================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename LIKE 'agent_%'
ORDER BY tablename, policyname;

-- Expected: 3 policies (one per table) for enterprise isolation


-- ==================================================
-- 4. Check indexes
-- ==================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename LIKE 'agent_%'
ORDER BY tablename, indexname;

-- Expected indexes:
-- agent_performance_history: idx_agent_performance_lookup, idx_agent_performance_time, idx_agent_performance_signature
-- agent_pheromones: idx_pheromone_lookup, idx_pheromone_strength, idx_pheromone_deposited, idx_pheromone_position
-- agent_swarm_patterns: idx_pattern_lookup, idx_pattern_performance, idx_pattern_signature


-- ==================================================
-- 5. Check helper functions
-- ==================================================

SELECT
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    prosrc as source_code
FROM pg_proc
WHERE proname IN ('evaporate_pheromones', 'record_agent_performance')
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Expected: 2 functions


-- ==================================================
-- 6. Sample data queries (after running tests)
-- ==================================================

-- Recent agent performance (last hour)
SELECT
    agent_type,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE success) as successful,
    ROUND(AVG(confidence)::numeric, 3) as avg_confidence,
    ROUND(AVG(duration_ms)::numeric, 0) as avg_duration_ms,
    MIN(executed_at) as first_execution,
    MAX(executed_at) as last_execution
FROM agent_performance_history
WHERE executed_at > NOW() - INTERVAL '1 hour'
GROUP BY agent_type
ORDER BY total_executions DESC;

-- Top pheromone trails
SELECT
    field_id,
    pheromone_type,
    position->>'agentSequence' as agent_sequence,
    ROUND(strength::numeric, 2) as strength,
    reinforcement_count,
    AGE(NOW(), deposited_at) as age,
    depositor_id
FROM agent_pheromones
ORDER BY strength DESC, reinforcement_count DESC
LIMIT 20;

-- Learned patterns (80%+ success rate)
SELECT
    pattern_type,
    name,
    agent_sequence,
    ROUND(success_rate::numeric, 3) as success_rate,
    ROUND(avg_confidence::numeric, 3) as avg_confidence,
    usage_count,
    ROUND(emergence_score::numeric, 3) as emergence_score,
    AGE(NOW(), discovered_at) as pattern_age
FROM agent_swarm_patterns
WHERE success_rate >= 0.80
ORDER BY success_rate DESC, usage_count DESC
LIMIT 10;


-- ==================================================
-- 7. Pheromone evaporation test
-- ==================================================

-- Check pheromone count before evaporation
SELECT COUNT(*) as pheromone_count_before
FROM agent_pheromones;

-- Run evaporation function
SELECT evaporate_pheromones() as evaporated_count;

-- Check pheromone count after evaporation
SELECT COUNT(*) as pheromone_count_after
FROM agent_pheromones;

-- View pheromone strength distribution
SELECT
    CASE
        WHEN strength >= 5.0 THEN 'Very Strong (5.0+)'
        WHEN strength >= 3.0 THEN 'Strong (3.0-5.0)'
        WHEN strength >= 1.0 THEN 'Medium (1.0-3.0)'
        WHEN strength >= 0.1 THEN 'Weak (0.1-1.0)'
        ELSE 'Very Weak (<0.1)'
    END as strength_category,
    COUNT(*) as count,
    ROUND(AVG(strength)::numeric, 2) as avg_strength
FROM agent_pheromones
GROUP BY strength_category
ORDER BY avg_strength DESC;


-- ==================================================
-- 8. Enterprise isolation verification
-- ==================================================

-- Check data distribution across enterprises
SELECT
    enterprise_id,
    COUNT(*) as performance_records
FROM agent_performance_history
GROUP BY enterprise_id
ORDER BY performance_records DESC;

SELECT
    enterprise_id,
    COUNT(*) as pheromone_trails
FROM agent_pheromones
GROUP BY enterprise_id
ORDER BY pheromone_trails DESC;

SELECT
    enterprise_id,
    COUNT(*) as learned_patterns
FROM agent_swarm_patterns
GROUP BY enterprise_id
ORDER BY learned_patterns DESC;


-- ==================================================
-- 9. Performance metrics
-- ==================================================

-- Agent success rates by type
SELECT
    agent_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE success) as successes,
    ROUND(COUNT(*) FILTER (WHERE success)::numeric / COUNT(*), 3) as success_rate,
    ROUND(AVG(confidence) FILTER (WHERE success)::numeric, 3) as avg_confidence_success,
    ROUND(AVG(confidence) FILTER (WHERE NOT success)::numeric, 3) as avg_confidence_failure
FROM agent_performance_history
GROUP BY agent_type
ORDER BY success_rate DESC;

-- Request type analysis
SELECT
    request_type,
    COUNT(*) as total_requests,
    ROUND(AVG(duration_ms)::numeric, 0) as avg_duration,
    ROUND(AVG(confidence)::numeric, 3) as avg_confidence,
    COUNT(*) FILTER (WHERE success)::numeric / COUNT(*) as success_rate
FROM agent_performance_history
GROUP BY request_type
ORDER BY total_requests DESC
LIMIT 10;


-- ==================================================
-- 10. Pattern emergence analysis
-- ==================================================

-- Show pattern evolution over time
SELECT
    name,
    pattern_type,
    agent_sequence,
    usage_count,
    ROUND(success_rate::numeric, 3) as success_rate,
    ROUND(emergence_score::numeric, 3) as emergence,
    discovered_at,
    last_used_at,
    AGE(last_used_at, discovered_at) as pattern_lifespan
FROM agent_swarm_patterns
WHERE usage_count >= 5
ORDER BY emergence_score DESC, usage_count DESC;

-- Identify emerging patterns (high emergence, low usage)
SELECT
    name,
    agent_sequence,
    usage_count,
    ROUND(success_rate::numeric, 3) as success_rate,
    ROUND(emergence_score::numeric, 3) as emergence_score
FROM agent_swarm_patterns
WHERE emergence_score >= 0.7
    AND usage_count < 10
ORDER BY emergence_score DESC;
