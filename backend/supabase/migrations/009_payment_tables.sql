-- Stripe Payment and Billing Tables

-- Stripe customers
CREATE TABLE stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    currency VARCHAR(3) DEFAULT 'usd',
    balance INTEGER DEFAULT 0,
    delinquent BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]',
    price_amount INTEGER NOT NULL, -- in cents
    price_currency VARCHAR(3) DEFAULT 'usd',
    billing_interval VARCHAR(20) NOT NULL, -- month, year
    trial_period_days INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL, -- active, past_due, canceled, incomplete, trialing
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- card, bank_account, etc
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    billing_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id),
    invoice_number VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
    amount_due INTEGER NOT NULL, -- in cents
    amount_paid INTEGER DEFAULT 0,
    amount_remaining INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    invoice_pdf VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage records for metered billing
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    metric_name VARCHAR(100) NOT NULL, -- contracts_analyzed, storage_gb, api_calls
    quantity INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscription_id, metric_name, timestamp)
);

-- Payment intents for tracking payment attempts
CREATE TABLE payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    payment_method_id VARCHAR(255),
    invoice_id UUID REFERENCES invoices(id),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing events log
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    event_type VARCHAR(100) NOT NULL,
    stripe_event_id VARCHAR(255) UNIQUE,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_stripe_customers_enterprise ON stripe_customers(enterprise_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;

CREATE INDEX idx_subscriptions_enterprise ON subscriptions(enterprise_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status IN ('active', 'trialing');
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

CREATE INDEX idx_payment_methods_enterprise ON payment_methods(enterprise_id);
CREATE INDEX idx_payment_methods_customer ON payment_methods(stripe_customer_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(enterprise_id, is_default) WHERE is_default = true;

CREATE INDEX idx_invoices_enterprise ON invoices(enterprise_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status = 'open';

CREATE INDEX idx_usage_records_subscription ON usage_records(subscription_id, timestamp);
CREATE INDEX idx_usage_records_metric ON usage_records(metric_name, timestamp);

CREATE INDEX idx_payment_intents_enterprise ON payment_intents(enterprise_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);

CREATE INDEX idx_billing_events_enterprise ON billing_events(enterprise_id);
CREATE INDEX idx_billing_events_processed ON billing_events(processed) WHERE processed = false;

-- Add triggers
CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their enterprise's billing data" ON stripe_customers
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Public can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their enterprise's subscription" ON subscriptions
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Admins can manage payment methods" ON payment_methods
    FOR ALL USING (enterprise_id = auth.user_enterprise_id() AND auth.has_role('admin'));

CREATE POLICY "Users can view their enterprise's invoices" ON invoices
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "System can manage usage records" ON usage_records
    FOR ALL USING (enterprise_id = auth.user_enterprise_id());

-- Function to calculate subscription usage
CREATE OR REPLACE FUNCTION calculate_subscription_usage(
    p_subscription_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
    metric_name VARCHAR,
    total_quantity BIGINT,
    last_recorded TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.metric_name,
        SUM(ur.quantity)::BIGINT as total_quantity,
        MAX(ur.timestamp) as last_recorded
    FROM usage_records ur
    WHERE ur.subscription_id = p_subscription_id
    AND ur.timestamp >= p_start_date
    AND ur.timestamp <= p_end_date
    GROUP BY ur.metric_name;
END;
$$ LANGUAGE plpgsql;