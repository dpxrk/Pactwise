-- Normalize address data across multiple tables to achieve 3NF/BCNF
-- This migration creates a centralized addresses table to eliminate redundancy

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'vendor', 'enterprise', 'user', 'contract'
    entity_id UUID NOT NULL,
    address_type VARCHAR(50) DEFAULT 'primary', -- 'primary', 'billing', 'shipping', 'legal'
    street_address_1 VARCHAR(255),
    street_address_2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2), -- ISO country code
    formatted_address TEXT, -- Full formatted address for display
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_verified BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique index for primary address
CREATE UNIQUE INDEX unique_primary_address 
ON addresses (entity_type, entity_id, address_type, is_primary) 
WHERE is_primary = true;

-- Create indexes for efficient lookups
CREATE INDEX idx_addresses_entity ON addresses(entity_type, entity_id);
CREATE INDEX idx_addresses_enterprise ON addresses(enterprise_id);
CREATE INDEX idx_addresses_geo ON addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Migrate vendor addresses
INSERT INTO addresses (
    entity_type,
    entity_id,
    address_type,
    formatted_address,
    enterprise_id,
    is_primary
)
SELECT 
    'vendor',
    id,
    'primary',
    address,
    enterprise_id,
    true
FROM vendors
WHERE address IS NOT NULL AND address != '';

-- Migrate contract extracted addresses
INSERT INTO addresses (
    entity_type,
    entity_id,
    address_type,
    formatted_address,
    enterprise_id,
    is_primary
)
SELECT 
    'contract',
    c.id,
    'legal',
    ce.extracted_address,
    c.enterprise_id,
    true
FROM contracts c
JOIN contract_extractions ce ON c.id = ce.contract_id
WHERE ce.extracted_address IS NOT NULL AND ce.extracted_address != '';

-- Add foreign key columns for backward compatibility
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS primary_address_id UUID REFERENCES addresses(id);

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS legal_address_id UUID REFERENCES addresses(id);

-- Update the foreign key references
UPDATE vendors v
SET primary_address_id = a.id
FROM addresses a
WHERE a.entity_type = 'vendor' AND a.entity_id = v.id AND a.is_primary = true;

UPDATE contracts c
SET legal_address_id = a.id
FROM addresses a
WHERE a.entity_type = 'contract' AND a.entity_id = c.id AND a.is_primary = true;

-- Add trigger for updated_at
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their enterprise's addresses" ON addresses
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can manage their enterprise's addresses" ON addresses
    FOR ALL USING (
        enterprise_id = auth.user_enterprise_id() 
        AND auth.has_role('manager')
    );

-- Create a function to geocode addresses (placeholder for actual implementation)
CREATE OR REPLACE FUNCTION geocode_address(p_address_id UUID)
RETURNS void AS $$
BEGIN
    -- This is a placeholder function
    -- In production, this would call a geocoding service
    -- and update the latitude/longitude fields
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to format addresses consistently
CREATE OR REPLACE FUNCTION format_address(
    p_street_1 VARCHAR,
    p_street_2 VARCHAR,
    p_city VARCHAR,
    p_state VARCHAR,
    p_postal VARCHAR,
    p_country VARCHAR
)
RETURNS TEXT AS $$
DECLARE
    v_formatted TEXT;
BEGIN
    v_formatted := '';
    
    IF p_street_1 IS NOT NULL THEN
        v_formatted := p_street_1;
    END IF;
    
    IF p_street_2 IS NOT NULL THEN
        v_formatted := v_formatted || ', ' || p_street_2;
    END IF;
    
    IF p_city IS NOT NULL THEN
        v_formatted := v_formatted || ', ' || p_city;
    END IF;
    
    IF p_state IS NOT NULL THEN
        v_formatted := v_formatted || ', ' || p_state;
    END IF;
    
    IF p_postal IS NOT NULL THEN
        v_formatted := v_formatted || ' ' || p_postal;
    END IF;
    
    IF p_country IS NOT NULL THEN
        v_formatted := v_formatted || ', ' || p_country;
    END IF;
    
    RETURN TRIM(BOTH ', ' FROM v_formatted);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Note: The old address columns are kept for backward compatibility
COMMENT ON COLUMN vendors.address IS 'DEPRECATED: Use addresses table instead. Will be removed in future migration.';
COMMENT ON COLUMN contract_extractions.extracted_address IS 'DEPRECATED: Use addresses table instead. Will be removed in future migration.';