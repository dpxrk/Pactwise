-- Migration: 057_optimize_n_plus_one_queries.sql
-- Description: Optimize N+1 query patterns in database functions with batch operations and CTEs
-- Created: 2025-01-15

-- ============================================================================
-- PART 1: OPTIMIZE NOTIFICATION SYSTEM (from 015_notification_system.sql)
-- ============================================================================

-- Drop the old function with N+1 pattern
DROP FUNCTION IF EXISTS send_bulk_notifications(UUID[], TEXT, TEXT, TEXT, JSONB);

-- Optimized bulk notification function using single INSERT with UNNEST
CREATE OR REPLACE FUNCTION send_bulk_notifications(
    p_user_ids UUID[],
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(notification_id UUID, user_id UUID, status TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Single INSERT for all notifications instead of loop
    RETURN QUERY
    WITH inserted_notifications AS (
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            data,
            created_at
        )
        SELECT 
            unnest(p_user_ids),
            p_title,
            p_message,
            p_type,
            p_data,
            NOW()
        RETURNING id, user_id
    )
    SELECT 
        n.id as notification_id,
        n.user_id,
        'sent'::TEXT as status
    FROM inserted_notifications n;
END;
$$;

-- ============================================================================
-- PART 2: OPTIMIZE CONTRACT BATCH OPERATIONS (from 013_business_logic_functions.sql)
-- ============================================================================

-- Drop old N+1 pattern function
DROP FUNCTION IF EXISTS update_contract_statuses();

-- Optimized contract status update using single UPDATE
CREATE OR REPLACE FUNCTION update_contract_statuses()
RETURNS TABLE(
    updated_count INTEGER,
    expired_contracts UUID[],
    expiring_soon UUID[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_expired_ids UUID[];
    v_expiring_ids UUID[];
    v_total_updated INTEGER;
BEGIN
    -- Use CTEs for batch updates instead of cursor loops
    WITH expired_updates AS (
        UPDATE contracts
        SET 
            status = 'expired',
            updated_at = NOW()
        WHERE 
            deleted_at IS NULL
            AND status = 'active'
            AND end_date < CURRENT_DATE
        RETURNING id
    ),
    expiring_updates AS (
        UPDATE contracts
        SET 
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{expiring_soon}',
                'true'::jsonb
            ),
            updated_at = NOW()
        WHERE 
            deleted_at IS NULL
            AND status = 'active'
            AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
            AND (metadata->>'expiring_soon')::boolean IS NOT true
        RETURNING id
    )
    SELECT 
        array_agg(DISTINCT e.id),
        array_agg(DISTINCT x.id),
        COUNT(DISTINCT e.id) + COUNT(DISTINCT x.id)
    INTO v_expired_ids, v_expiring_ids, v_total_updated
    FROM expired_updates e
    FULL OUTER JOIN expiring_updates x ON false;

    -- Send notifications in batch (using optimized function)
    IF array_length(v_expired_ids, 1) > 0 THEN
        PERFORM send_bulk_notifications(
            ARRAY(
                SELECT DISTINCT u.id
                FROM contracts c
                JOIN users u ON u.enterprise_id = c.enterprise_id
                WHERE c.id = ANY(v_expired_ids)
                    AND u.deleted_at IS NULL
                    AND u.is_active = true
            ),
            'Contract Expired',
            'One or more contracts have expired',
            'contract_expiry',
            jsonb_build_object('contract_ids', v_expired_ids)
        );
    END IF;

    RETURN QUERY SELECT 
        v_total_updated,
        v_expired_ids,
        v_expiring_ids;
END;
$$;

-- ============================================================================
-- PART 3: OPTIMIZE VENDOR BATCH CALCULATIONS (from 014_advanced_business_functions.sql)
-- ============================================================================

-- Drop old function with loops
DROP FUNCTION IF EXISTS calculate_all_vendor_scores(UUID);

-- Optimized vendor score calculation using window functions
CREATE OR REPLACE FUNCTION calculate_vendor_scores_batch(p_enterprise_id UUID)
RETURNS TABLE(
    vendor_id UUID,
    performance_score DECIMAL,
    compliance_score DECIMAL,
    updated_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vendor_metrics AS (
        SELECT 
            v.id as vendor_id,
            -- Performance calculation using analytics functions
            CASE 
                WHEN COUNT(c.id) = 0 THEN 85.0
                ELSE 
                    LEAST(100, GREATEST(0,
                        50.0 +
                        (AVG(CASE WHEN c.status = 'completed' THEN 10 ELSE 0 END)) +
                        (AVG(CASE WHEN c.actual_end_date <= c.end_date THEN 10 ELSE -5 END)) +
                        (COUNT(CASE WHEN c.status = 'active' THEN 1 END) * 2) -
                        (COUNT(CASE WHEN c.status = 'terminated' THEN 1 END) * 5)
                    ))
            END as perf_score,
            -- Compliance score
            CASE
                WHEN v.updated_at IS NULL THEN 70.0
                WHEN v.updated_at < NOW() - INTERVAL '90 days' THEN 60.0
                ELSE COALESCE(v.compliance_score, 80.0)
            END as comp_score,
            COUNT(c.id) as contract_count,
            SUM(c.value) as total_value
        FROM vendors v
        LEFT JOIN contracts c ON c.vendor_id = v.id AND c.deleted_at IS NULL
        WHERE v.enterprise_id = p_enterprise_id
            AND v.deleted_at IS NULL
        GROUP BY v.id, v.compliance_score, v.updated_at
    ),
    score_updates AS (
        UPDATE vendors v
        SET
            performance_score = vm.perf_score,
            compliance_score = vm.comp_score,
            total_contract_value = vm.total_value,
            updated_at = NOW()
        FROM vendor_metrics vm
        WHERE v.id = vm.vendor_id
        RETURNING v.id, v.performance_score, v.compliance_score
    )
    SELECT
        su.id,
        su.performance_score,
        su.compliance_score,
        COUNT(*) OVER()::INTEGER as updated_count
    FROM score_updates su;
END;
$$;

-- ============================================================================
-- PART 4: OPTIMIZE BUDGET ROLLUP CALCULATIONS
-- ============================================================================

-- Create efficient budget rollup function using recursive CTE
CREATE OR REPLACE FUNCTION calculate_budget_rollups(p_enterprise_id UUID)
RETURNS TABLE(
    budget_id UUID,
    total_allocated DECIMAL,
    total_spent DECIMAL,
    total_remaining DECIMAL,
    child_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE budget_tree AS (
        -- Base case: leaf budgets
        SELECT 
            b.id,
            b.parent_budget_id,
            b.allocated_amount,
            b.spent_amount,
            0 as level
        FROM budgets b
        WHERE b.enterprise_id = p_enterprise_id
            AND b.deleted_at IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM budgets b2 
                WHERE b2.parent_budget_id = b.id 
                    AND b2.deleted_at IS NULL
            )
        
        UNION ALL
        
        -- Recursive case: parent budgets
        SELECT 
            p.id,
            p.parent_budget_id,
            p.allocated_amount + COALESCE(SUM(bt.allocated_amount), 0),
            p.spent_amount + COALESCE(SUM(bt.spent_amount), 0),
            bt.level + 1
        FROM budgets p
        JOIN budget_tree bt ON bt.parent_budget_id = p.id
        WHERE p.deleted_at IS NULL
        GROUP BY p.id, p.parent_budget_id, p.allocated_amount, p.spent_amount, bt.level
    )
    SELECT 
        bt.id,
        SUM(bt.allocated_amount) as total_allocated,
        SUM(bt.spent_amount) as total_spent,
        SUM(bt.allocated_amount - bt.spent_amount) as total_remaining,
        COUNT(*)::INTEGER as child_count
    FROM budget_tree bt
    GROUP BY bt.id;
END;
$$;

-- ============================================================================
-- PART 5: OPTIMIZE AGENT TASK BATCH PROCESSING
-- ============================================================================

-- Create efficient task assignment function
CREATE OR REPLACE FUNCTION assign_tasks_to_agents_batch(
    p_enterprise_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    task_id UUID,
    agent_type TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH available_tasks AS (
        SELECT 
            t.id,
            t.task_type,
            t.priority,
            t.created_at,
            -- Use window function to rank tasks
            ROW_NUMBER() OVER (
                PARTITION BY t.task_type 
                ORDER BY t.priority DESC, t.created_at ASC
            ) as rank
        FROM agent_tasks t
        WHERE t.enterprise_id = p_enterprise_id
            AND t.status = 'pending'
            AND t.scheduled_at <= NOW()
            AND t.retry_count < 3
    ),
    task_assignments AS (
        UPDATE agent_tasks
        SET 
            status = 'processing',
            started_at = NOW(),
            updated_at = NOW()
        FROM available_tasks at
        WHERE agent_tasks.id = at.id
            AND at.rank <= p_limit
        RETURNING agent_tasks.id, agent_tasks.agent_type, agent_tasks.started_at
    )
    SELECT * FROM task_assignments;
END;
$$;

-- ============================================================================
-- PART 6: OPTIMIZE CONTRACT ANALYSIS QUEUE
-- ============================================================================

-- Create batch contract analysis function
CREATE OR REPLACE FUNCTION queue_contract_analyses_batch(
    p_enterprise_id UUID,
    p_analysis_type TEXT DEFAULT 'full'
)
RETURNS TABLE(
    queued_count INTEGER,
    contract_ids UUID[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_contract_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Get all contracts needing analysis in one query
    WITH contracts_to_analyze AS (
        SELECT c.id
        FROM contracts c
        WHERE c.enterprise_id = p_enterprise_id
            AND c.deleted_at IS NULL
            AND c.analysis_status IN ('pending', 'outdated')
            AND c.file_type IS NOT NULL
        ORDER BY 
            CASE c.analysis_priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                ELSE 4
            END,
            c.created_at ASC
        LIMIT 100
    ),
    inserted_tasks AS (
        INSERT INTO agent_tasks (
            enterprise_id,
            task_type,
            agent_type,
            status,
            priority,
            input_data,
            scheduled_at
        )
        SELECT 
            p_enterprise_id,
            'contract_analysis',
            'analysis',
            'pending',
            CASE 
                WHEN c.value > 1000000 THEN 90
                WHEN c.value > 500000 THEN 70
                WHEN c.value > 100000 THEN 50
                ELSE 30
            END,
            jsonb_build_object(
                'contract_id', c.id,
                'analysis_type', p_analysis_type,
                'contract_value', c.value,
                'vendor_id', c.vendor_id
            ),
            NOW()
        FROM contracts c
        JOIN contracts_to_analyze cta ON c.id = cta.id
        RETURNING input_data->>'contract_id'
    )
    SELECT 
        COUNT(*)::INTEGER,
        array_agg(contract_id::UUID)
    INTO v_count, v_contract_ids
    FROM inserted_tasks;
    
    -- Update contract statuses in batch
    UPDATE contracts
    SET 
        analysis_status = 'queued',
        updated_at = NOW()
    WHERE id = ANY(v_contract_ids);
    
    RETURN QUERY SELECT v_count, v_contract_ids;
END;
$$;

-- ============================================================================
-- PART 7: CREATE BATCH OPERATION HELPER FUNCTIONS
-- ============================================================================

-- Generic batch update function for any table
CREATE OR REPLACE FUNCTION batch_update_jsonb_field(
    p_table_name TEXT,
    p_ids UUID[],
    p_field_name TEXT,
    p_json_path TEXT[],
    p_new_value JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_sql TEXT;
BEGIN
    -- Build dynamic SQL for batch JSONB update
    v_sql := format(
        'UPDATE %I SET %I = jsonb_set(COALESCE(%I, ''{}''::jsonb), $1, $2, true), updated_at = NOW() WHERE id = ANY($3) AND deleted_at IS NULL',
        p_table_name,
        p_field_name,
        p_field_name
    );
    
    EXECUTE v_sql USING p_json_path, p_new_value, p_ids;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$$;

-- Batch fetch with joins optimization
CREATE OR REPLACE FUNCTION fetch_contracts_with_relations_batch(
    p_contract_ids UUID[]
)
RETURNS TABLE(
    contract_id UUID,
    contract_data JSONB,
    vendor_data JSONB,
    budget_data JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        to_jsonb(c.*) - 'deleted_at' - 'created_at' - 'updated_at',
        CASE WHEN v.id IS NOT NULL 
            THEN to_jsonb(v.*) - 'deleted_at' - 'created_at' - 'updated_at'
            ELSE NULL 
        END,
        CASE WHEN b.id IS NOT NULL 
            THEN to_jsonb(b.*) - 'deleted_at' - 'created_at' - 'updated_at'
            ELSE NULL 
        END
    FROM contracts c
    LEFT JOIN vendors v ON c.vendor_id = v.id AND v.deleted_at IS NULL
    LEFT JOIN budgets b ON c.budget_id = b.id AND b.deleted_at IS NULL
    WHERE c.id = ANY(p_contract_ids)
        AND c.deleted_at IS NULL;
END;
$$;

-- ============================================================================
-- PART 8: CREATE INDEXES TO SUPPORT BATCH OPERATIONS
-- ============================================================================

-- Index for batch notification inserts
CREATE INDEX IF NOT EXISTS idx_notifications_bulk_insert 
ON notifications(user_id, type, created_at DESC)
WHERE is_read = false;

-- Index for batch contract updates
CREATE INDEX IF NOT EXISTS idx_contracts_batch_status_update 
ON contracts(enterprise_id, status, end_date)
WHERE deleted_at IS NULL AND status = 'active';

-- Index for batch vendor calculations
CREATE INDEX IF NOT EXISTS idx_vendors_batch_scoring
ON vendors(enterprise_id, deleted_at)
WHERE deleted_at IS NULL;

-- Index for efficient task batching
CREATE INDEX IF NOT EXISTS idx_agent_tasks_batch_processing
ON agent_tasks(enterprise_id, status, task_type, priority DESC, created_at, scheduled_at)
WHERE status = 'pending';

-- ============================================================================
-- PART 9: MONITORING AND METRICS FOR BATCH OPERATIONS
-- ============================================================================

-- Create batch operation metrics table
CREATE TABLE IF NOT EXISTS batch_operation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_name VARCHAR(100) NOT NULL,
    record_count INTEGER NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_operation_metrics_analysis 
ON batch_operation_metrics(operation_name, created_at DESC);

-- Function to log batch operation performance
CREATE OR REPLACE FUNCTION log_batch_operation(
    p_operation_name TEXT,
    p_record_count INTEGER,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_execution_time_ms INTEGER;
    v_id UUID;
BEGIN
    v_execution_time_ms := EXTRACT(MILLISECOND FROM (NOW() - p_start_time))::INTEGER;
    
    INSERT INTO batch_operation_metrics (
        operation_name,
        record_count,
        execution_time_ms,
        success,
        error_message,
        metadata
    ) VALUES (
        p_operation_name,
        p_record_count,
        v_execution_time_ms,
        p_success,
        p_error_message,
        p_metadata || jsonb_build_object(
            'records_per_second', 
            CASE WHEN v_execution_time_ms > 0 
                THEN (p_record_count * 1000.0 / v_execution_time_ms)::DECIMAL(10,2)
                ELSE NULL 
            END
        )
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- ============================================================================
-- PART 10: UPDATE STATISTICS
-- ============================================================================

ANALYZE contracts;
ANALYZE vendors;
ANALYZE budgets;
ANALYZE notifications;
ANALYZE agent_tasks;
ANALYZE batch_operation_metrics;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION send_bulk_notifications IS 'Optimized bulk notification sending using single INSERT';
COMMENT ON FUNCTION update_contract_statuses IS 'Batch contract status updates using CTEs instead of loops';
COMMENT ON FUNCTION calculate_vendor_scores_batch IS 'Batch vendor scoring using window functions';
COMMENT ON FUNCTION calculate_budget_rollups IS 'Efficient budget hierarchy calculations using recursive CTEs';
COMMENT ON FUNCTION assign_tasks_to_agents_batch IS 'Batch task assignment with priority ranking';
COMMENT ON FUNCTION queue_contract_analyses_batch IS 'Batch queueing of contract analysis tasks';
COMMENT ON FUNCTION batch_update_jsonb_field IS 'Generic helper for batch JSONB field updates';
COMMENT ON FUNCTION fetch_contracts_with_relations_batch IS 'Optimized batch fetching with related data';
COMMENT ON FUNCTION log_batch_operation IS 'Performance logging for batch operations';
COMMENT ON TABLE batch_operation_metrics IS 'Stores performance metrics for batch database operations';