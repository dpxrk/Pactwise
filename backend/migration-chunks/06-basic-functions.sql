-- ========================================
-- PACTWISE BASIC FUNCTIONS (Part 6 of 6)
-- Run this AFTER Part 5 in Supabase SQL Editor
-- Only includes functions for tables created in Parts 1-5
-- ========================================

-- Function to create a new contract
CREATE OR REPLACE FUNCTION create_contract_with_analysis(
    p_title VARCHAR,
    p_file_name VARCHAR,
    p_file_type VARCHAR,
    p_storage_id TEXT,
    p_vendor_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_auto_analyze BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
    v_contract_id UUID;
    v_user_id UUID;
    v_enterprise_id UUID;
BEGIN
    -- Get current user info
    SELECT id, enterprise_id INTO v_user_id, v_enterprise_id
    FROM users WHERE auth_id = auth.uid();
    
    -- Validate user exists and has proper context
    IF v_user_id IS NULL OR v_enterprise_id IS NULL THEN
        RAISE EXCEPTION 'User not found or missing enterprise context';
    END IF;
    
    -- Validate user has permission to create contracts
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND enterprise_id = v_enterprise_id
        AND role IN ('user', 'manager', 'admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to create contracts';
    END IF;
    
    -- If vendor_id provided, ensure it belongs to the same enterprise
    IF p_vendor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM vendors 
            WHERE id = p_vendor_id 
            AND enterprise_id = v_enterprise_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Vendor not found or access denied';
        END IF;
    END IF;
    
    -- Create contract
    INSERT INTO contracts (
        title, file_name, file_type, storage_id,
        vendor_id, notes, enterprise_id, created_by, owner_id
    ) VALUES (
        p_title, p_file_name, p_file_type, p_storage_id,
        p_vendor_id, p_notes, v_enterprise_id, v_user_id, v_user_id
    ) RETURNING id INTO v_contract_id;
    
    -- Queue for analysis if requested
    IF p_auto_analyze THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            contract_id,
            enterprise_id
        ) VALUES (
            (SELECT id FROM agents WHERE type = 'secretary' AND is_active = true LIMIT 1),
            'analyze_contract',
            8,
            jsonb_build_object('contract_id', v_contract_id, 'storage_id', p_storage_id),
            v_contract_id,
            v_enterprise_id
        );
    END IF;
    
    RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit logging function
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_old_data JSONB,
    p_new_data JSONB,
    p_enterprise_id UUID
) RETURNS void AS $$
BEGIN
    -- Simple audit logging - can be expanded later
    -- For now, just log to the Supabase logs
    RAISE LOG 'Audit: User % performed % on % ID % in enterprise %', 
        p_user_id, p_action, p_resource_type, p_resource_id, p_enterprise_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update vendor performance metrics
CREATE OR REPLACE FUNCTION update_vendor_performance_metrics(p_vendor_id UUID)
RETURNS void AS $$
DECLARE
    v_total_value DECIMAL(15,2);
    v_active_count INTEGER;
    v_performance DECIMAL(3,2);
BEGIN
    -- Calculate total contract value and active contracts
    SELECT 
        COALESCE(SUM(value), 0),
        COUNT(*) FILTER (WHERE status = 'active')
    INTO v_total_value, v_active_count
    FROM contracts
    WHERE vendor_id = p_vendor_id
    AND deleted_at IS NULL;
    
    -- Calculate overall performance (simplified)
    v_performance := LEAST(5.0, GREATEST(0.0, 
        CASE 
            WHEN v_active_count > 0 THEN 3.0 + (v_active_count * 0.5)
            ELSE 2.0
        END
    ));
    
    -- Update vendor metrics
    UPDATE vendors SET
        total_contract_value = v_total_value,
        active_contracts = v_active_count,
        performance_score = v_performance,
        updated_at = NOW()
    WHERE id = p_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update budget status
CREATE OR REPLACE FUNCTION update_budget_status(p_budget_id UUID)
RETURNS void AS $$
DECLARE
    v_budget RECORD;
    v_new_status budget_status;
    v_percentage DECIMAL(5,2);
BEGIN
    -- Get budget details
    SELECT * INTO v_budget FROM budgets WHERE id = p_budget_id;
    
    -- Calculate percentage used
    v_percentage := CASE 
        WHEN v_budget.total_budget = 0 THEN 0
        ELSE (v_budget.spent_amount / v_budget.total_budget) * 100
    END;
    
    -- Determine new status
    v_new_status := CASE
        WHEN v_percentage >= 100 THEN 'exceeded'
        WHEN v_percentage >= 80 THEN 'at_risk'
        ELSE 'healthy'
    END;
    
    -- Update if status changed
    IF v_new_status != v_budget.status THEN
        UPDATE budgets 
        SET status = v_new_status,
            alerts = alerts || jsonb_build_object(
                'timestamp', NOW(),
                'type', 'status_change',
                'old_status', v_budget.status,
                'new_status', v_new_status,
                'percentage_used', v_percentage
            )
        WHERE id = p_budget_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate basic contract analytics
CREATE OR REPLACE FUNCTION get_contract_analytics(
    p_enterprise_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH contract_stats AS (
        SELECT 
            COUNT(*) as total_contracts,
            COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
            COUNT(*) FILTER (WHERE status = 'expired') as expired_contracts,
            COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status = 'active') as expiring_soon,
            SUM(value) as total_value,
            AVG(value) as avg_value
        FROM contracts
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    vendor_stats AS (
        SELECT 
            COUNT(DISTINCT vendor_id) as total_vendors,
            AVG(performance_score) as avg_vendor_performance
        FROM vendors
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
    ),
    budget_stats AS (
        SELECT 
            SUM(total_budget) as total_budget,
            SUM(spent_amount) as total_spent,
            AVG(spent_amount / NULLIF(total_budget, 0) * 100) as avg_budget_utilization
        FROM budgets
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
    )
    SELECT jsonb_build_object(
        'contracts', row_to_json(contract_stats),
        'vendors', row_to_json(vendor_stats),
        'budgets', row_to_json(budget_stats),
        'generated_at', NOW()
    ) INTO v_result
    FROM contract_stats, vendor_stats, budget_stats;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vendor metrics when contracts change
CREATE OR REPLACE FUNCTION trigger_update_vendor_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.vendor_id IS NOT NULL THEN
            PERFORM update_vendor_performance_metrics(NEW.vendor_id);
        END IF;
        IF TG_OP = 'UPDATE' AND OLD.vendor_id IS NOT NULL AND OLD.vendor_id != NEW.vendor_id THEN
            PERFORM update_vendor_performance_metrics(OLD.vendor_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vendor_id IS NOT NULL THEN
            PERFORM update_vendor_performance_metrics(OLD.vendor_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_metrics_on_contract_change
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION trigger_update_vendor_metrics();

-- Trigger to update budget status when allocations change
CREATE OR REPLACE FUNCTION trigger_update_budget_on_allocation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update budget spent amount
    UPDATE budgets b
    SET spent_amount = (
        SELECT COALESCE(SUM(cba.allocated_amount), 0)
        FROM contract_budget_allocations cba
        WHERE cba.budget_id = b.id
    )
    WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
    
    -- Check and update status
    PERFORM update_budget_status(COALESCE(NEW.budget_id, OLD.budget_id));
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_on_allocation_change
AFTER INSERT OR UPDATE OR DELETE ON contract_budget_allocations
FOR EACH ROW EXECUTE FUNCTION trigger_update_budget_on_allocation();

-- Create indexes for function performance
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_performance ON contracts(vendor_id, status, value) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_enterprise_analytics ON contracts(enterprise_id, created_at, status) WHERE deleted_at IS NULL;