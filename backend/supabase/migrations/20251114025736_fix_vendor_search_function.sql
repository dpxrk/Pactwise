-- Fix vendor search function to use primary_contact_name instead of contact_name
-- The contact_name column was dropped in migration 062 and replaced with primary_contact_name in migration 075

CREATE OR REPLACE FUNCTION update_search_index(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_enterprise_id UUID
) RETURNS void AS $$
DECLARE
    v_title TEXT;
    v_content TEXT;
    v_metadata JSONB;
    v_tags TEXT[];
BEGIN
    -- Build search content based on entity type
    CASE p_entity_type
        WHEN 'contract' THEN
            SELECT
                c.title,
                COALESCE(c.title, '') || ' ' ||
                COALESCE(c.notes, '') || ' ' ||
                COALESCE(v.name, '') || ' ' ||
                COALESCE(c.contract_type, ''),
                jsonb_build_object(
                    'status', c.status,
                    'vendor_name', v.name,
                    'value', c.value,
                    'start_date', c.start_date,
                    'end_date', c.end_date
                ),
                COALESCE(c.tags, ARRAY[]::TEXT[])
            INTO v_title, v_content, v_metadata, v_tags
            FROM contracts c
            LEFT JOIN vendors v ON v.id = c.vendor_id
            WHERE c.id = p_entity_id;

        WHEN 'vendor' THEN
            SELECT
                v.name,
                COALESCE(v.name, '') || ' ' ||
                COALESCE(v.primary_contact_name, '') || ' ' ||
                COALESCE(v.address, '') || ' ' ||
                COALESCE(v.category::TEXT, ''),
                jsonb_build_object(
                    'category', v.category,
                    'status', v.status,
                    'performance_score', v.performance_score
                ),
                ARRAY[]::TEXT[]
            INTO v_title, v_content, v_metadata, v_tags
            FROM vendors v
            WHERE v.id = p_entity_id;

        WHEN 'document' THEN
            SELECT
                cd.title,
                cd.content,
                jsonb_build_object(
                    'document_type', cd.document_type,
                    'version', cd.version
                ),
                ARRAY[]::TEXT[]
            INTO v_title, v_content, v_metadata, v_tags
            FROM collaborative_documents cd
            WHERE cd.id = p_entity_id;
    END CASE;

    -- Update or insert search index
    INSERT INTO search_indexes (
        entity_type,
        entity_id,
        title,
        content,
        metadata,
        tags,
        search_vector,
        enterprise_id
    ) VALUES (
        p_entity_type,
        p_entity_id,
        v_title,
        v_content,
        v_metadata,
        v_tags,
        to_tsvector('pactwise_search', COALESCE(v_title, '') || ' ' || COALESCE(v_content, '')),
        p_enterprise_id
    )
    ON CONFLICT (entity_type, entity_id)
    DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        tags = EXCLUDED.tags,
        search_vector = EXCLUDED.search_vector,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
