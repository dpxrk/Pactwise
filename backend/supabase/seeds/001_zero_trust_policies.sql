-- Seed data for zero_trust_policies

-- Note: These policies are examples and should be reviewed and customized for your specific security requirements.

-- Get the enterprise_id for the default enterprise
-- This assumes you have a default enterprise in your 'enterprises' table.
-- Replace 'Pactwise' with the actual name of your default enterprise if different.
DO $$
DECLARE
    default_enterprise_id uuid;
BEGIN
    SELECT id INTO default_enterprise_id FROM public.enterprises WHERE name = 'Pactwise' LIMIT 1;

    -- Baseline Policies
    INSERT INTO public.zero_trust_policies (enterprise_id, name, description, priority, enabled, conditions, actions)
    VALUES
        -- Deny access from untrusted devices
        (default_enterprise_id, 'Deny Untrusted Devices', 'Denies access from devices with an untrusted trust level.', 900,
        true,
        '[{"type": "device_trust", "operator": "equals", "value": "untrusted", "weight": 1}]'::jsonb,
        '[{"type": "deny"}]'::jsonb),

        -- Challenge high-risk scores
        (default_enterprise_id, 'Challenge High Risk Score', 'Requires a challenge for users with a high risk score.', 800,
        true,
        '[{"type": "risk_score", "operator": "greater_than", "value": 0.7, "weight": 1}]'::jsonb,
        '[{"type": "challenge"}]'::jsonb),

        -- Require MFA for suspicious behavior
        (default_enterprise_id, 'Require MFA for Suspicious Behavior', 'Requires MFA for users exhibiting suspicious behavior.', 700,
        true,
        '[{"type": "behavior_trust", "operator": "equals", "value": "suspicious", "weight": 1}]'::jsonb,
        '[{"type": "require_mfa"}]'::jsonb),

        -- Allow access from trusted devices on corporate network
        (default_enterprise_id, 'Allow Trusted Access', 'Allows access from trusted devices on the corporate network.', 100,
        true,
        '[{"type": "device_trust", "operator": "equals", "value": "trusted", "weight": 0.5}, {"type": "network_trust", "operator": "equals", "value": "corporate", "weight": 0.5}]'::jsonb,
        '[{"type": "allow"}]'::jsonb);
END $$;
