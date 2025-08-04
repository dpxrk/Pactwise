-- Create contract_extractions table
CREATE TABLE contract_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    extracted_parties JSONB DEFAULT '[]',
    extracted_address TEXT,
    extracted_start_date DATE,
    extracted_end_date DATE,
    extracted_payment_schedule JSONB DEFAULT '[]',
    extracted_pricing JSONB DEFAULT '{}',
    extracted_scope TEXT,
    extracted_key_terms JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER update_contract_extractions_updated_at BEFORE UPDATE ON contract_extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Move existing extracted data to the new table
INSERT INTO contract_extractions (
    contract_id,
    extracted_parties,
    extracted_address,
    extracted_start_date,
    extracted_end_date,
    extracted_payment_schedule,
    extracted_pricing,
    extracted_scope,
    extracted_key_terms
)
SELECT
    id,
    extracted_parties,
    extracted_address,
    extracted_start_date,
    extracted_end_date,
    extracted_payment_schedule,
    extracted_pricing,
    extracted_scope,
    extracted_key_terms
FROM contracts;

-- Remove old extracted columns from contracts table
ALTER TABLE contracts
DROP COLUMN extracted_parties,
DROP COLUMN extracted_address,
DROP COLUMN extracted_start_date,
DROP COLUMN extracted_end_date,
DROP COLUMN extracted_payment_schedule,
DROP COLUMN extracted_pricing,
DROP COLUMN extracted_scope,
DROP COLUMN extracted_key_terms;