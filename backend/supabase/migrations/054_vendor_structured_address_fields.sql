-- Migration: Add structured address fields directly to vendors table for easier filtering
-- This migration adds city, state, and country columns to the vendors table
-- while maintaining compatibility with the normalized addresses table

-- Add structured address columns to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(2), -- ISO country code
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS street_address_1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS street_address_2 VARCHAR(255);

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_state_province ON vendors(state_province);
CREATE INDEX IF NOT EXISTS idx_vendors_country ON vendors(country);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors(city, state_province, country);

-- Migrate data from the addresses table to vendor columns
UPDATE vendors v
SET 
    street_address_1 = a.street_address_1,
    street_address_2 = a.street_address_2,
    city = a.city,
    state_province = a.state_province,
    postal_code = a.postal_code,
    country = a.country
FROM addresses a
WHERE a.entity_type = 'vendor' 
AND a.entity_id = v.id 
AND a.is_primary = true;

-- For vendors with only the old address field, try to parse it
-- This is a best-effort approach to extract city, state from formatted addresses
-- Note: This assumes addresses follow a common format like "street, city, state postal"
UPDATE vendors
SET 
    city = CASE 
        WHEN address IS NOT NULL AND address LIKE '%,%' 
        THEN TRIM(SPLIT_PART(SPLIT_PART(address, ',', -2), ',', 1))
        ELSE NULL
    END,
    state_province = CASE 
        WHEN address IS NOT NULL AND address LIKE '%,%' 
        THEN TRIM(SPLIT_PART(SPLIT_PART(address, ',', -1), ' ', 1))
        ELSE NULL
    END
WHERE city IS NULL 
AND state_province IS NULL
AND address IS NOT NULL 
AND address != '';

-- Create a function to sync vendor address changes with the addresses table
CREATE OR REPLACE FUNCTION sync_vendor_address()
RETURNS TRIGGER AS $$
BEGIN
    -- If any address field changed
    IF (OLD.street_address_1 IS DISTINCT FROM NEW.street_address_1 OR
        OLD.street_address_2 IS DISTINCT FROM NEW.street_address_2 OR
        OLD.city IS DISTINCT FROM NEW.city OR
        OLD.state_province IS DISTINCT FROM NEW.state_province OR
        OLD.postal_code IS DISTINCT FROM NEW.postal_code OR
        OLD.country IS DISTINCT FROM NEW.country) THEN
        
        -- Update or insert into addresses table
        INSERT INTO addresses (
            entity_type,
            entity_id,
            address_type,
            street_address_1,
            street_address_2,
            city,
            state_province,
            postal_code,
            country,
            formatted_address,
            enterprise_id,
            is_primary
        )
        VALUES (
            'vendor',
            NEW.id,
            'primary',
            NEW.street_address_1,
            NEW.street_address_2,
            NEW.city,
            NEW.state_province,
            NEW.postal_code,
            NEW.country,
            format_address(
                NEW.street_address_1,
                NEW.street_address_2,
                NEW.city,
                NEW.state_province,
                NEW.postal_code,
                NEW.country
            ),
            NEW.enterprise_id,
            true
        )
        ON CONFLICT (entity_type, entity_id, address_type, is_primary) 
        WHERE is_primary = true
        DO UPDATE SET
            street_address_1 = EXCLUDED.street_address_1,
            street_address_2 = EXCLUDED.street_address_2,
            city = EXCLUDED.city,
            state_province = EXCLUDED.state_province,
            postal_code = EXCLUDED.postal_code,
            country = EXCLUDED.country,
            formatted_address = EXCLUDED.formatted_address,
            updated_at = NOW();
            
        -- Update the formatted address field in vendors
        NEW.address = format_address(
            NEW.street_address_1,
            NEW.street_address_2,
            NEW.city,
            NEW.state_province,
            NEW.postal_code,
            NEW.country
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync address changes
CREATE TRIGGER sync_vendor_address_trigger
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION sync_vendor_address();

-- Create a view for easy vendor location filtering
CREATE OR REPLACE VIEW vendor_locations AS
SELECT 
    v.id,
    v.name,
    v.category_id,
    vc.display_name as category_name,
    v.subcategory_id,
    vs.display_name as subcategory_name,
    v.city,
    v.state_province,
    v.country,
    v.postal_code,
    v.street_address_1,
    v.street_address_2,
    v.address as formatted_address,
    v.status,
    v.enterprise_id
FROM vendors v
LEFT JOIN vendor_categories vc ON v.category_id = vc.id
LEFT JOIN vendor_subcategories vs ON v.subcategory_id = vs.id
WHERE v.status = 'active';

-- Create function to search vendors by location
CREATE OR REPLACE FUNCTION search_vendors_by_location(
    p_enterprise_id UUID,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    category_display_name VARCHAR,
    subcategory_display_name VARCHAR,
    city VARCHAR,
    state_province VARCHAR,
    country VARCHAR,
    formatted_address TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.id,
        vl.name,
        vl.category_name,
        vl.subcategory_name,
        vl.city,
        vl.state_province,
        vl.country,
        vl.formatted_address
    FROM vendor_locations vl
    WHERE vl.enterprise_id = p_enterprise_id
    AND (p_city IS NULL OR LOWER(vl.city) LIKE LOWER('%' || p_city || '%'))
    AND (p_state IS NULL OR LOWER(vl.state_province) LIKE LOWER('%' || p_state || '%'))
    AND (p_country IS NULL OR vl.country = p_country)
    ORDER BY vl.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get vendors by category and location
CREATE OR REPLACE FUNCTION get_vendors_by_category_and_location(
    p_enterprise_id UUID,
    p_category_id UUID DEFAULT NULL,
    p_subcategory_id UUID DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    category_display_name VARCHAR,
    subcategory_display_name VARCHAR,
    city VARCHAR,
    state_province VARCHAR,
    country VARCHAR,
    formatted_address TEXT,
    performance_score DECIMAL,
    compliance_score DECIMAL,
    total_contract_value DECIMAL,
    active_contracts INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.name,
        vc.display_name as category_display_name,
        vs.display_name as subcategory_display_name,
        v.city,
        v.state_province,
        v.country,
        v.address as formatted_address,
        v.performance_score,
        v.compliance_score,
        v.total_contract_value,
        v.active_contracts
    FROM vendors v
    LEFT JOIN vendor_categories vc ON v.category_id = vc.id
    LEFT JOIN vendor_subcategories vs ON v.subcategory_id = vs.id
    WHERE v.enterprise_id = p_enterprise_id
    AND v.status = 'active'
    AND (p_category_id IS NULL OR v.category_id = p_category_id)
    AND (p_subcategory_id IS NULL OR v.subcategory_id = p_subcategory_id)
    AND (p_city IS NULL OR LOWER(v.city) LIKE LOWER('%' || p_city || '%'))
    AND (p_state IS NULL OR LOWER(v.state_province) LIKE LOWER('%' || p_state || '%'))
    AND (p_country IS NULL OR v.country = p_country)
    ORDER BY v.performance_score DESC, v.name;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN vendors.city IS 'City where the vendor is located';
COMMENT ON COLUMN vendors.state_province IS 'State or province where the vendor is located';
COMMENT ON COLUMN vendors.country IS 'ISO 2-letter country code where the vendor is located';
COMMENT ON COLUMN vendors.postal_code IS 'Postal or ZIP code for the vendor location';
COMMENT ON COLUMN vendors.street_address_1 IS 'Primary street address line';
COMMENT ON COLUMN vendors.street_address_2 IS 'Secondary street address line (suite, unit, etc.)';
COMMENT ON VIEW vendor_locations IS 'Simplified view for filtering vendors by location and category';
COMMENT ON FUNCTION search_vendors_by_location IS 'Search vendors by city, state, and/or country';
COMMENT ON FUNCTION get_vendors_by_category_and_location IS 'Get vendors filtered by both category and location';