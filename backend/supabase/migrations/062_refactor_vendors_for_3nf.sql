-- Create contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Move existing vendor contacts to the new contacts table
INSERT INTO contacts (vendor_id, name, email, phone, is_primary)
SELECT id, contact_name, contact_email, contact_phone, true
FROM vendors
WHERE contact_name IS NOT NULL OR contact_email IS NOT NULL OR contact_phone IS NOT NULL;

-- Remove old contact columns from vendors table
ALTER TABLE vendors
DROP COLUMN contact_name,
DROP COLUMN contact_email,
DROP COLUMN contact_phone;