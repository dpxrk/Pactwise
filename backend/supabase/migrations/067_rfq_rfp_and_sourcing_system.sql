-- Migration 067: RFQ/RFP and Sourcing System
-- Description: Tables and functions for RFQ/RFP management and intelligent supplier sourcing
-- Author: System
-- Date: 2025-10-28

-- ============================================================================
-- RFQ/RFP SYSTEM TABLES
-- ============================================================================

-- RFQ/RFP Status Enum
CREATE TYPE rfq_status AS ENUM (
  'draft',
  'published',
  'questions',
  'bidding',
  'evaluation',
  'awarded',
  'cancelled',
  'closed'
);

-- Bid Status Enum
CREATE TYPE bid_status AS ENUM (
  'invited',
  'acknowledged',
  'submitted',
  'under_review',
  'shortlisted',
  'rejected',
  'awarded'
);

-- Main RFQs/RFPs Table
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Basic Information
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('RFQ', 'RFP')),
  status rfq_status NOT NULL DEFAULT 'draft',
  category TEXT,

  -- Requirements
  requirements JSONB NOT NULL DEFAULT '{}',
  specifications TEXT,
  estimated_value DECIMAL(15, 2),

  -- Evaluation Criteria
  evaluation_criteria JSONB NOT NULL DEFAULT '{}',
  evaluation_weights JSONB NOT NULL DEFAULT '{"price": 0.4, "quality": 0.3, "delivery": 0.15, "experience": 0.15}',

  -- Timeline
  response_deadline TIMESTAMPTZ NOT NULL,
  qa_deadline TIMESTAMPTZ,

  -- Document
  document_url TEXT,
  document_metadata JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',

  -- Status Tracking
  published_at TIMESTAMPTZ,
  awarded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Vendor Tracking
  invited_vendor_ids UUID[] DEFAULT '{}',
  received_bid_ids UUID[] DEFAULT '{}',
  winning_bid_id UUID,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_rfq_number_per_enterprise UNIQUE (enterprise_id, rfq_number),
  CONSTRAINT valid_response_deadline CHECK (response_deadline > created_at),
  CONSTRAINT qa_before_response CHECK (qa_deadline IS NULL OR qa_deadline < response_deadline)
);

-- RFQ Bids Table
CREATE TABLE rfq_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Bid Information
  status bid_status NOT NULL DEFAULT 'invited',
  total_price DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',
  validity_days INTEGER DEFAULT 90,

  -- Proposal Details
  pricing JSONB DEFAULT '{}',
  technical_proposal JSONB DEFAULT '{}',
  delivery_timeline JSONB DEFAULT '{}',
  payment_terms TEXT,

  -- Supporting Documents
  attachments JSONB DEFAULT '[]',
  "references" JSONB DEFAULT '[]',

  -- Evaluation
  score DECIMAL(5, 2),
  rank INTEGER,
  evaluation JSONB DEFAULT '{}',
  compliance_checklist JSONB DEFAULT '{}',
  compliance_score DECIMAL(5, 2),

  -- Status Tracking
  submitted_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_vendor_bid_per_rfq UNIQUE (rfq_id, vendor_id),
  CONSTRAINT positive_price CHECK (total_price IS NULL OR total_price > 0),
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT valid_rank CHECK (rank IS NULL OR rank > 0)
);

-- RFQ Questions Table (Q&A)
CREATE TABLE rfq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Question Details
  question TEXT NOT NULL,
  answer TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,

  -- Tracking
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  answered_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SOURCING SYSTEM TABLES
-- ============================================================================

-- Sourcing Request Status
CREATE TYPE sourcing_status AS ENUM (
  'draft',
  'searching',
  'evaluating',
  'rfq_sent',
  'completed',
  'cancelled'
);

-- Sourcing Requests Table
CREATE TABLE sourcing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Request Details
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  specifications TEXT NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  unit_of_measure TEXT,

  -- Requirements
  required_by DATE,
  budget_max DECIMAL(15, 2),
  budget_currency TEXT DEFAULT 'USD',
  preferred_vendor_ids UUID[] DEFAULT '{}',

  -- Status
  status sourcing_status NOT NULL DEFAULT 'draft',

  -- Results
  discovered_supplier_count INTEGER DEFAULT 0,
  qualified_supplier_count INTEGER DEFAULT 0,
  rfq_id UUID REFERENCES rfqs(id),

  -- Recommendations
  recommendations JSONB DEFAULT '{}',

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT positive_budget CHECK (budget_max IS NULL OR budget_max > 0),
  CONSTRAINT future_required_date CHECK (required_by IS NULL OR required_by > CURRENT_DATE)
);

-- Discovered Suppliers Table
CREATE TABLE discovered_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcing_request_id UUID NOT NULL REFERENCES sourcing_requests(id) ON DELETE CASCADE,

  -- Supplier Information
  vendor_id UUID REFERENCES vendors(id), -- NULL if new/external supplier
  supplier_name TEXT NOT NULL,
  source TEXT NOT NULL, -- 'existing_vendor', 'marketplace', 'web_scraping', 'industry_db'

  -- Contact Information
  email TEXT,
  phone TEXT,
  website TEXT,
  country TEXT,

  -- Capabilities
  categories TEXT[] DEFAULT '{}',
  capabilities JSONB DEFAULT '{}',

  -- Evaluation Scores
  match_score DECIMAL(5, 4) NOT NULL,
  risk_score DECIMAL(5, 4) NOT NULL,
  total_score DECIMAL(5, 4) NOT NULL,

  -- Assessment
  can_fulfill_quantity BOOLEAN DEFAULT TRUE,
  estimated_price DECIMAL(15, 2),
  estimated_lead_time_days INTEGER,

  -- Performance Data (if existing vendor)
  on_time_delivery_rate DECIMAL(5, 4),
  quality_rating DECIMAL(5, 2),

  -- Metadata
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_match_score CHECK (match_score >= 0 AND match_score <= 1),
  CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 1),
  CONSTRAINT valid_total_score CHECK (total_score >= 0 AND total_score <= 1)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- RFQs Indexes
CREATE INDEX idx_rfqs_enterprise_id ON rfqs(enterprise_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_category ON rfqs(category);
CREATE INDEX idx_rfqs_response_deadline ON rfqs(response_deadline);
CREATE INDEX idx_rfqs_created_at ON rfqs(created_at DESC);
CREATE INDEX idx_rfqs_rfq_number ON rfqs(rfq_number);

-- RFQ Bids Indexes
CREATE INDEX idx_rfq_bids_rfq_id ON rfq_bids(rfq_id);
CREATE INDEX idx_rfq_bids_vendor_id ON rfq_bids(vendor_id);
CREATE INDEX idx_rfq_bids_status ON rfq_bids(status);
CREATE INDEX idx_rfq_bids_score ON rfq_bids(score DESC NULLS LAST);
CREATE INDEX idx_rfq_bids_rank ON rfq_bids(rank);

-- RFQ Questions Indexes
CREATE INDEX idx_rfq_questions_rfq_id ON rfq_questions(rfq_id);
CREATE INDEX idx_rfq_questions_vendor_id ON rfq_questions(vendor_id);
CREATE INDEX idx_rfq_questions_is_public ON rfq_questions(is_public);

-- Sourcing Requests Indexes
CREATE INDEX idx_sourcing_requests_enterprise_id ON sourcing_requests(enterprise_id);
CREATE INDEX idx_sourcing_requests_status ON sourcing_requests(status);
CREATE INDEX idx_sourcing_requests_category ON sourcing_requests(category);
CREATE INDEX idx_sourcing_requests_created_at ON sourcing_requests(created_at DESC);

-- Discovered Suppliers Indexes
CREATE INDEX idx_discovered_suppliers_sourcing_request_id ON discovered_suppliers(sourcing_request_id);
CREATE INDEX idx_discovered_suppliers_vendor_id ON discovered_suppliers(vendor_id);
CREATE INDEX idx_discovered_suppliers_total_score ON discovered_suppliers(total_score DESC);
CREATE INDEX idx_discovered_suppliers_source ON discovered_suppliers(source);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_suppliers ENABLE ROW LEVEL SECURITY;

-- RFQs RLS Policies
CREATE POLICY "Users can view RFQs in their enterprise"
  ON rfqs FOR SELECT
  USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid);

CREATE POLICY "Users can create RFQs in their enterprise"
  ON rfqs FOR INSERT
  WITH CHECK (
    enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update RFQs in their enterprise"
  ON rfqs FOR UPDATE
  USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid);

CREATE POLICY "Users can delete RFQs in their enterprise"
  ON rfqs FOR DELETE
  USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid);

-- RFQ Bids RLS Policies
CREATE POLICY "Users can view bids for their enterprise RFQs"
  ON rfq_bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rfqs
      WHERE rfqs.id = rfq_bids.rfq_id
      AND rfqs.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

CREATE POLICY "Users can create bids for their enterprise RFQs"
  ON rfq_bids FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rfqs
      WHERE rfqs.id = rfq_bids.rfq_id
      AND rfqs.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

CREATE POLICY "Users can update bids for their enterprise RFQs"
  ON rfq_bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rfqs
      WHERE rfqs.id = rfq_bids.rfq_id
      AND rfqs.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

-- RFQ Questions RLS Policies
CREATE POLICY "Users can view questions for their enterprise RFQs"
  ON rfq_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rfqs
      WHERE rfqs.id = rfq_questions.rfq_id
      AND rfqs.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

CREATE POLICY "Users can create questions for their enterprise RFQs"
  ON rfq_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rfqs
      WHERE rfqs.id = rfq_questions.rfq_id
      AND rfqs.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

CREATE POLICY "Users can update questions for their enterprise RFQs"
  ON rfq_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rfqs
      WHERE rfqs.id = rfq_questions.rfq_id
      AND rfqs.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

-- Sourcing Requests RLS Policies
CREATE POLICY "Users can view sourcing requests in their enterprise"
  ON sourcing_requests FOR SELECT
  USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid);

CREATE POLICY "Users can create sourcing requests in their enterprise"
  ON sourcing_requests FOR INSERT
  WITH CHECK (
    enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update sourcing requests in their enterprise"
  ON sourcing_requests FOR UPDATE
  USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid);

-- Discovered Suppliers RLS Policies
CREATE POLICY "Users can view discovered suppliers for their enterprise"
  ON discovered_suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sourcing_requests
      WHERE sourcing_requests.id = discovered_suppliers.sourcing_request_id
      AND sourcing_requests.enterprise_id = (auth.jwt() ->> 'enterprise_id')::uuid
    )
  );

CREATE POLICY "System can manage discovered suppliers"
  ON discovered_suppliers FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to auto-generate RFQ number
CREATE OR REPLACE FUNCTION generate_rfq_number(p_enterprise_id UUID, p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Count existing RFQs today for this enterprise
  SELECT COUNT(*) INTO v_count
  FROM rfqs
  WHERE enterprise_id = p_enterprise_id
  AND DATE(created_at) = CURRENT_DATE;

  -- Format: RFQ-20251028-001 or RFP-20251028-001
  v_number := p_type || '-' || v_date || '-' || LPAD((v_count + 1)::TEXT, 3, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update RFQ updated_at timestamp
CREATE OR REPLACE FUNCTION update_rfq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_rfqs_updated_at
  BEFORE UPDATE ON rfqs
  FOR EACH ROW
  EXECUTE FUNCTION update_rfq_updated_at();

CREATE TRIGGER trigger_rfq_bids_updated_at
  BEFORE UPDATE ON rfq_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_rfq_updated_at();

CREATE TRIGGER trigger_rfq_questions_updated_at
  BEFORE UPDATE ON rfq_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_rfq_updated_at();

CREATE TRIGGER trigger_sourcing_requests_updated_at
  BEFORE UPDATE ON sourcing_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_rfq_updated_at();

-- Function to calculate bid rank after evaluation
CREATE OR REPLACE FUNCTION calculate_bid_ranks(p_rfq_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ranked_bids AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC NULLS LAST) AS new_rank
    FROM rfq_bids
    WHERE rfq_id = p_rfq_id
    AND score IS NOT NULL
  )
  UPDATE rfq_bids
  SET rank = ranked_bids.new_rank
  FROM ranked_bids
  WHERE rfq_bids.id = ranked_bids.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get RFQ statistics
CREATE OR REPLACE FUNCTION get_rfq_statistics(p_rfq_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_rfq RECORD;
  v_stats JSONB;
BEGIN
  SELECT * INTO v_rfq FROM rfqs WHERE id = p_rfq_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'rfq_id', v_rfq.id,
    'status', v_rfq.status,
    'vendors_invited', COALESCE(array_length(v_rfq.invited_vendor_ids, 1), 0),
    'bids_received', COALESCE(array_length(v_rfq.received_bid_ids, 1), 0),
    'response_rate', CASE
      WHEN COALESCE(array_length(v_rfq.invited_vendor_ids, 1), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(array_length(v_rfq.received_bid_ids, 1), 0)::DECIMAL /
                  COALESCE(array_length(v_rfq.invited_vendor_ids, 1), 1)) * 100, 2)
    END,
    'questions_count', (SELECT COUNT(*) FROM rfq_questions WHERE rfq_id = p_rfq_id),
    'unanswered_questions', (SELECT COUNT(*) FROM rfq_questions WHERE rfq_id = p_rfq_id AND answer IS NULL),
    'evaluated_bids', (SELECT COUNT(*) FROM rfq_bids WHERE rfq_id = p_rfq_id AND score IS NOT NULL),
    'average_score', COALESCE((SELECT AVG(score) FROM rfq_bids WHERE rfq_id = p_rfq_id AND score IS NOT NULL), 0),
    'highest_score', COALESCE((SELECT MAX(score) FROM rfq_bids WHERE rfq_id = p_rfq_id), 0),
    'lowest_score', COALESCE((SELECT MIN(score) FROM rfq_bids WHERE rfq_id = p_rfq_id AND score IS NOT NULL), 0),
    'time_remaining_hours', EXTRACT(EPOCH FROM (v_rfq.response_deadline - NOW())) / 3600
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE rfqs IS 'RFQ/RFP (Request for Quote/Proposal) management table';
COMMENT ON TABLE rfq_bids IS 'Vendor bids/proposals submitted in response to RFQs/RFPs';
COMMENT ON TABLE rfq_questions IS 'Questions and answers during RFQ/RFP Q&A period';
COMMENT ON TABLE sourcing_requests IS 'Intelligent supplier sourcing requests';
COMMENT ON TABLE discovered_suppliers IS 'Suppliers discovered through sourcing process';

COMMENT ON FUNCTION generate_rfq_number IS 'Auto-generates sequential RFQ/RFP numbers per enterprise';
COMMENT ON FUNCTION calculate_bid_ranks IS 'Calculates and updates bid rankings based on scores';
COMMENT ON FUNCTION get_rfq_statistics IS 'Returns comprehensive statistics for an RFQ/RFP';
