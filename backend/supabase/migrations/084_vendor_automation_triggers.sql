-- =====================================================
-- Vendor Automation Triggers
-- =====================================================
-- Description: Automatically queue agent tasks when vendors are created or updated
-- Agents triggered:
--   1. Vendor Agent: Auto-categorization, risk assessment (priority 7)
--   2. Data Quality Agent: Completeness check, duplicate detection (priority 6)
--   3. Compliance Agent: Requirements assessment (priority 6)
-- =====================================================

-- Function to queue vendor analysis tasks
CREATE OR REPLACE FUNCTION queue_vendor_analysis_tasks()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_agent_id UUID;
    v_data_quality_agent_id UUID;
    v_compliance_agent_id UUID;
    v_is_new_vendor BOOLEAN;
    v_significant_change BOOLEAN := false;
BEGIN
    -- Determine if this is a new vendor or update
    v_is_new_vendor := (TG_OP = 'INSERT');

    -- For updates, check if there are significant changes that warrant re-analysis
    IF TG_OP = 'UPDATE' THEN
        v_significant_change := (
            OLD.name IS DISTINCT FROM NEW.name OR
            OLD.category IS DISTINCT FROM NEW.category OR
            OLD.website IS DISTINCT FROM NEW.website OR
            OLD.contact_email IS DISTINCT FROM NEW.contact_email OR
            OLD.contact_phone IS DISTINCT FROM NEW.contact_phone OR
            OLD.address IS DISTINCT FROM NEW.address OR
            OLD.status IS DISTINCT FROM NEW.status
        );

        -- Skip if no significant changes
        IF NOT v_significant_change THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Get agent IDs for this enterprise
    SELECT id INTO v_vendor_agent_id
    FROM agents
    WHERE type = 'vendor'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_data_quality_agent_id
    FROM agents
    WHERE type = 'data-quality'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_compliance_agent_id
    FROM agents
    WHERE type = 'compliance'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Vendor Agent task: Auto-categorization and risk assessment
    IF v_vendor_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_vendor_agent_id,
            CASE
                WHEN v_is_new_vendor THEN 'vendor_auto_categorization'
                ELSE 'vendor_re_evaluation'
            END,
            7, -- High priority
            jsonb_build_object(
                'vendor_id', NEW.id,
                'vendor_name', NEW.name,
                'category', NEW.category,
                'is_new', v_is_new_vendor,
                'action', 'analyze_vendor',
                'trigger_source', 'vendor_automation'
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Data Quality Agent task: Completeness check and duplicate detection
    IF v_data_quality_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_data_quality_agent_id,
            'data_quality_check',
            6, -- Medium-high priority
            jsonb_build_object(
                'vendor_id', NEW.id,
                'vendor_name', NEW.name,
                'checks', jsonb_build_array(
                    'completeness',
                    'duplicate_detection',
                    'data_validation',
                    'enrichment_opportunities'
                ),
                'is_new', v_is_new_vendor,
                'trigger_source', 'vendor_automation'
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Compliance Agent task: Requirements assessment
    IF v_compliance_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_compliance_agent_id,
            'vendor_compliance_check',
            6, -- Medium-high priority
            jsonb_build_object(
                'vendor_id', NEW.id,
                'vendor_name', NEW.name,
                'category', NEW.category,
                'checks', jsonb_build_array(
                    'required_documentation',
                    'certification_requirements',
                    'insurance_validation',
                    'regulatory_compliance'
                ),
                'is_new', v_is_new_vendor,
                'trigger_source', 'vendor_automation'
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on vendors table
DROP TRIGGER IF EXISTS trigger_analyze_vendor ON vendors;
CREATE TRIGGER trigger_analyze_vendor
    AFTER INSERT OR UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION queue_vendor_analysis_tasks();

-- Add comment for documentation
COMMENT ON FUNCTION queue_vendor_analysis_tasks() IS
'Automatically queues agent tasks when vendors are created or updated.
Triggers: Vendor Agent (categorization), Data Quality Agent (validation), Compliance Agent (requirements).
Only triggers on significant changes to avoid unnecessary processing.';

COMMENT ON TRIGGER trigger_analyze_vendor ON vendors IS
'Automatically triggers vendor analysis when vendors are created or significantly updated.
Queues tasks for Vendor Agent, Data Quality Agent, and Compliance Agent.';
