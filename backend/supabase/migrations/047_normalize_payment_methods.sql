-- Normalize payment_methods table to achieve 3NF/BCNF
-- This migration addresses the issue where card-specific fields are only relevant for card payment types

-- Create payment_method_cards table for card-specific data
CREATE TABLE IF NOT EXISTS payment_method_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    brand VARCHAR(50) NOT NULL,
    last4 VARCHAR(4) NOT NULL,
    exp_month INTEGER NOT NULL CHECK (exp_month >= 1 AND exp_month <= 12),
    exp_year INTEGER NOT NULL CHECK (exp_year >= 2024),
    fingerprint VARCHAR(255), -- Card fingerprint for duplicate detection
    funding VARCHAR(20), -- credit, debit, prepaid, unknown
    country VARCHAR(2), -- ISO country code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payment_method_id)
);

-- Create payment_method_bank_accounts table for bank account-specific data
CREATE TABLE IF NOT EXISTS payment_method_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    bank_name VARCHAR(255),
    last4 VARCHAR(4) NOT NULL,
    routing_number VARCHAR(20),
    account_type VARCHAR(20), -- checking, savings
    account_holder_name VARCHAR(255),
    account_holder_type VARCHAR(20), -- individual, company
    country VARCHAR(2), -- ISO country code
    currency VARCHAR(3), -- ISO currency code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payment_method_id)
);

-- Migrate existing card data
INSERT INTO payment_method_cards (
    payment_method_id,
    brand,
    last4,
    exp_month,
    exp_year
)
SELECT 
    id,
    card_brand,
    card_last4,
    card_exp_month,
    card_exp_year
FROM payment_methods
WHERE type = 'card' 
    AND card_brand IS NOT NULL 
    AND card_last4 IS NOT NULL
    AND card_exp_month IS NOT NULL
    AND card_exp_year IS NOT NULL;

-- Add columns for backward compatibility (will be removed in future migration)
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS has_card_details BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_bank_details BOOLEAN DEFAULT false;

-- Create function to update has_details flags
CREATE OR REPLACE FUNCTION update_payment_method_flags() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'payment_method_cards' THEN
        UPDATE payment_methods 
        SET has_card_details = true 
        WHERE id = COALESCE(NEW.payment_method_id, OLD.payment_method_id);
    ELSIF TG_TABLE_NAME = 'payment_method_bank_accounts' THEN
        UPDATE payment_methods 
        SET has_bank_details = true 
        WHERE id = COALESCE(NEW.payment_method_id, OLD.payment_method_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain the flags
CREATE TRIGGER update_card_details_flag
AFTER INSERT OR DELETE ON payment_method_cards
FOR EACH ROW EXECUTE FUNCTION update_payment_method_flags();

CREATE TRIGGER update_bank_details_flag  
AFTER INSERT OR DELETE ON payment_method_bank_accounts
FOR EACH ROW EXECUTE FUNCTION update_payment_method_flags();

-- Create indexes for performance
CREATE INDEX idx_payment_method_cards_payment_method ON payment_method_cards(payment_method_id);
CREATE INDEX idx_payment_method_cards_fingerprint ON payment_method_cards(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX idx_payment_method_bank_accounts_payment_method ON payment_method_bank_accounts(payment_method_id);

-- Add triggers for updated_at
CREATE TRIGGER update_payment_method_cards_updated_at BEFORE UPDATE ON payment_method_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_method_bank_accounts_updated_at BEFORE UPDATE ON payment_method_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE payment_method_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their enterprise's card details" ON payment_method_cards
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM payment_methods pm 
        WHERE pm.id = payment_method_cards.payment_method_id 
        AND pm.enterprise_id = auth.user_enterprise_id()
    ));

CREATE POLICY "Admins can manage card details" ON payment_method_cards
    FOR ALL USING (EXISTS (
        SELECT 1 FROM payment_methods pm 
        WHERE pm.id = payment_method_cards.payment_method_id 
        AND pm.enterprise_id = auth.user_enterprise_id()
        AND auth.has_role('admin')
    ));

CREATE POLICY "Users can view their enterprise's bank details" ON payment_method_bank_accounts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM payment_methods pm 
        WHERE pm.id = payment_method_bank_accounts.payment_method_id 
        AND pm.enterprise_id = auth.user_enterprise_id()
    ));

CREATE POLICY "Admins can manage bank details" ON payment_method_bank_accounts
    FOR ALL USING (EXISTS (
        SELECT 1 FROM payment_methods pm 
        WHERE pm.id = payment_method_bank_accounts.payment_method_id 
        AND pm.enterprise_id = auth.user_enterprise_id()
        AND auth.has_role('admin')
    ));

-- Note: The old card columns in payment_methods table are kept for backward compatibility
-- They should be removed in a future migration after updating all application code
COMMENT ON COLUMN payment_methods.card_brand IS 'DEPRECATED: Use payment_method_cards table instead. Will be removed in future migration.';
COMMENT ON COLUMN payment_methods.card_last4 IS 'DEPRECATED: Use payment_method_cards table instead. Will be removed in future migration.';
COMMENT ON COLUMN payment_methods.card_exp_month IS 'DEPRECATED: Use payment_method_cards table instead. Will be removed in future migration.';
COMMENT ON COLUMN payment_methods.card_exp_year IS 'DEPRECATED: Use payment_method_cards table instead. Will be removed in future migration.';