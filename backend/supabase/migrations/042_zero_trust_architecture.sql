-- Migration: 042_zero_trust_architecture
-- Description: Creates the tables required for the Zero-Trust Architecture.
-- Date: 2025-07-28

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Table for Zero-Trust Policies
CREATE TABLE IF NOT EXISTS public.zero_trust_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.zero_trust_policies IS 'Stores the rules for the Zero-Trust Policy Engine.';

-- Table for Zero-Trust Audit Logs
CREATE TABLE IF NOT EXISTS public.zero_trust_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE,
    session_id TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT,
    confidence DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    device_trust TEXT,
    network_trust TEXT,
    behavior_trust TEXT,
    source_ip INET,
    user_agent TEXT,
    location JSONB,
    audit_trail JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.zero_trust_audit_log IS 'Logs every access decision made by the Zero-Trust engine.';

-- Table for Trusted Devices
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    fingerprint TEXT NOT NULL,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    enterprise_id uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ NOT NULL,
    trust_level TEXT NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (fingerprint, user_id)
);

COMMENT ON TABLE public.trusted_devices IS 'Stores information about devices that have been seen and their trust level.';

-- Table for Corporate Networks
CREATE TABLE IF NOT EXISTS public.corporate_networks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ip_range CIDR NOT NULL,
    trust_level TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.corporate_networks IS 'Defines trusted corporate network IP ranges for an enterprise.';

-- Table for User Behavior Patterns
CREATE TABLE IF NOT EXISTS public.user_behavior_patterns (
    id BIGSERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    enterprise_id uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
    access_time TIMESTAMPTZ NOT NULL,
    ip_address INET,
    location_country TEXT,
    location_city TEXT,
    device_fingerprint TEXT,
    success BOOLEAN,
    failed_attempts INTEGER DEFAULT 0,
    risk_score DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_behavior_patterns IS 'Stores historical user access patterns for anomaly detection.';

-- Table for Zero-Trust Sessions
CREATE TABLE IF NOT EXISTS public.zero_trust_sessions (
    session_id TEXT PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    enterprise_id uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    trust_level TEXT,
    risk_score DOUBLE PRECISION,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity TIMESTAMPTZ,
    auth_method TEXT
);

COMMENT ON TABLE public.zero_trust_sessions IS 'Manages continuously verified user sessions.';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_zero_trust_policies_enterprise ON public.zero_trust_policies(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_zero_trust_audit_log_user ON public.zero_trust_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_zero_trust_audit_log_enterprise ON public.zero_trust_audit_log(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_networks_enterprise ON public.corporate_networks(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_user ON public.user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_zero_trust_sessions_user ON public.zero_trust_sessions(user_id);
