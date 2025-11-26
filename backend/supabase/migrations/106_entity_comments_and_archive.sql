-- Migration 106: Entity Comments System and Archive Functionality
-- Creates a unified comments system for all entity types and adds archive support

-- ============================================================================
-- 1. ENTITY COMMENTS TABLE
-- ============================================================================

-- Create entity_comments table for unified commenting across all entities
CREATE TABLE IF NOT EXISTS entity_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'contracts', 'vendors', 'documents', 'budgets'
    entity_id UUID NOT NULL,
    parent_id UUID REFERENCES entity_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    mentions UUID[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    reactions JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_entity_type CHECK (entity_type IN ('contracts', 'vendors', 'documents', 'budgets'))
);

-- Add indexes for entity_comments
CREATE INDEX IF NOT EXISTS idx_entity_comments_entity
    ON entity_comments(entity_type, entity_id, enterprise_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_comments_parent
    ON entity_comments(parent_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_comments_author
    ON entity_comments(author_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_comments_mentions
    ON entity_comments USING gin(mentions)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_comments_resolved
    ON entity_comments(entity_type, entity_id, is_resolved)
    WHERE deleted_at IS NULL;

-- Add table comment
COMMENT ON TABLE entity_comments IS 'Unified comments system for contracts, vendors, documents, and budgets';

-- ============================================================================
-- 2. RLS POLICIES FOR ENTITY_COMMENTS
-- ============================================================================

ALTER TABLE entity_comments ENABLE ROW LEVEL SECURITY;

-- View policy: Users can view comments in their enterprise
CREATE POLICY entity_comments_select ON entity_comments
    FOR SELECT
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
    );

-- Insert policy: Users can create comments in their enterprise
CREATE POLICY entity_comments_insert ON entity_comments
    FOR INSERT
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
        AND author_id = auth.uid()
    );

-- Update policy: Authors can update their own comments
CREATE POLICY entity_comments_update ON entity_comments
    FOR UPDATE
    USING (
        author_id = auth.uid()
        OR enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE id = auth.uid()
            AND role IN ('manager', 'admin', 'owner')
        )
    )
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
    );

-- Delete policy: Authors can soft-delete their comments, managers can delete any
CREATE POLICY entity_comments_delete ON entity_comments
    FOR DELETE
    USING (
        author_id = auth.uid()
        OR enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE id = auth.uid()
            AND role IN ('manager', 'admin', 'owner')
        )
    );

-- ============================================================================
-- 3. ARCHIVE COLUMNS FOR CONTRACTS AND VENDORS
-- ============================================================================

-- Add archived_at column to contracts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contracts' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE contracts ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE contracts ADD COLUMN archived_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add archived_at column to vendors if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vendors' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE vendors ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE vendors ADD COLUMN archived_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add indexes for archived columns
CREATE INDEX IF NOT EXISTS idx_contracts_archived
    ON contracts(enterprise_id, archived_at)
    WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_archived
    ON vendors(enterprise_id, archived_at)
    WHERE archived_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN contracts.archived_at IS 'Timestamp when contract was archived (null = not archived)';
COMMENT ON COLUMN vendors.archived_at IS 'Timestamp when vendor was archived (null = not archived)';

-- ============================================================================
-- 4. HELPER FUNCTIONS FOR COMMENTS
-- ============================================================================

-- Function to get comment count for an entity
CREATE OR REPLACE FUNCTION get_entity_comment_count(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_enterprise_id UUID
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM entity_comments
        WHERE entity_type = p_entity_type
        AND entity_id = p_entity_id
        AND enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND parent_id IS NULL -- Only count top-level comments
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get unresolved comment count
CREATE OR REPLACE FUNCTION get_unresolved_comment_count(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_enterprise_id UUID
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM entity_comments
        WHERE entity_type = p_entity_type
        AND entity_id = p_entity_id
        AND enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND is_resolved = false
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. ARCHIVE/UNARCHIVE FUNCTIONS
-- ============================================================================

-- Function to archive a contract
CREATE OR REPLACE FUNCTION archive_contract(
    p_contract_id UUID,
    p_user_id UUID,
    p_enterprise_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
BEGIN
    -- Get contract
    SELECT id, title, status, archived_at INTO v_contract
    FROM contracts
    WHERE id = p_contract_id
    AND enterprise_id = p_enterprise_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;

    IF v_contract.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'Contract is already archived';
    END IF;

    -- Archive the contract
    UPDATE contracts
    SET archived_at = NOW(),
        archived_by = p_user_id,
        updated_at = NOW(),
        last_modified_by = p_user_id
    WHERE id = p_contract_id;

    -- Log status change
    INSERT INTO contract_status_history (
        contract_id, previous_status, new_status, changed_by, reason
    ) VALUES (
        p_contract_id, v_contract.status, v_contract.status, p_user_id, 'Contract archived'
    );

    RETURN jsonb_build_object(
        'success', true,
        'contract_id', p_contract_id,
        'archived_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to unarchive a contract
CREATE OR REPLACE FUNCTION unarchive_contract(
    p_contract_id UUID,
    p_user_id UUID,
    p_enterprise_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
BEGIN
    -- Get contract
    SELECT id, title, status, archived_at INTO v_contract
    FROM contracts
    WHERE id = p_contract_id
    AND enterprise_id = p_enterprise_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;

    IF v_contract.archived_at IS NULL THEN
        RAISE EXCEPTION 'Contract is not archived';
    END IF;

    -- Unarchive the contract
    UPDATE contracts
    SET archived_at = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        last_modified_by = p_user_id
    WHERE id = p_contract_id;

    -- Log status change
    INSERT INTO contract_status_history (
        contract_id, previous_status, new_status, changed_by, reason
    ) VALUES (
        p_contract_id, v_contract.status, v_contract.status, p_user_id, 'Contract unarchived'
    );

    RETURN jsonb_build_object(
        'success', true,
        'contract_id', p_contract_id,
        'unarchived_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- 6. ADD LAST_COMMENT_VIEW_AT TO USERS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_comment_view_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_comment_view_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

COMMENT ON COLUMN users.last_comment_view_at IS 'Last time user viewed their comment mentions (for unread count)';

-- ============================================================================
-- 7. TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_entity_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entity_comments_updated_at ON entity_comments;
CREATE TRIGGER entity_comments_updated_at
    BEFORE UPDATE ON entity_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_comments_updated_at();

-- ============================================================================
-- 8. NOTIFICATION TRIGGER FOR MENTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_author_name TEXT;
BEGIN
    -- Get author name
    SELECT COALESCE(full_name, email) INTO v_author_name
    FROM users WHERE id = NEW.author_id;

    -- Create notification for each mentioned user
    FOREACH v_user_id IN ARRAY NEW.mentions
    LOOP
        -- Don't notify the author
        IF v_user_id != NEW.author_id THEN
            INSERT INTO notifications (
                user_id, type, title, message, severity,
                data, enterprise_id
            ) VALUES (
                v_user_id,
                'comment_mention',
                'You were mentioned in a comment',
                v_author_name || ' mentioned you in a comment',
                'medium',
                jsonb_build_object(
                    'entity_type', NEW.entity_type,
                    'entity_id', NEW.entity_id,
                    'comment_id', NEW.id,
                    'author_id', NEW.author_id,
                    'preview', LEFT(NEW.content, 100)
                ),
                NEW.enterprise_id
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_comment_mentions_trigger ON entity_comments;
CREATE TRIGGER notify_comment_mentions_trigger
    AFTER INSERT ON entity_comments
    FOR EACH ROW
    WHEN (array_length(NEW.mentions, 1) > 0)
    EXECUTE FUNCTION notify_comment_mentions();

-- ============================================================================
-- DONE
-- ============================================================================
