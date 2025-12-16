-- Migration 125: Spend Analytics and Vendor Scorecards
-- Implements comprehensive spend tracking, analytics, and multi-dimensional vendor performance scoring

-- =====================================================
-- SPEND TRACKING
-- =====================================================

-- Spend Categories (hierarchical)
CREATE TABLE spend_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  code TEXT,

  -- Hierarchy
  parent_category_id UUID REFERENCES spend_categories(id),
  level INTEGER DEFAULT 0,
  path TEXT[],  -- Full path for hierarchy queries

  -- Classification
  category_type TEXT NOT NULL CHECK (category_type IN (
    'direct', 'indirect', 'capex', 'opex', 'services', 'materials',
    'software', 'hardware', 'professional_services', 'facilities',
    'travel', 'marketing', 'hr', 'it', 'legal', 'other'
  )),

  -- Budget allocation
  annual_budget NUMERIC(15,2),
  budget_currency TEXT DEFAULT 'USD',

  -- GL mapping
  gl_account_code TEXT,
  cost_center TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, code)
);

-- Spend Records (individual spend entries)
CREATE TABLE spend_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Source
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  invoice_id UUID,  -- External invoice reference
  po_number TEXT,

  -- Categorization
  category_id UUID REFERENCES spend_categories(id),

  -- Amount
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  amount_usd NUMERIC(15,2),  -- Normalized to USD
  exchange_rate NUMERIC(12,6),

  -- Time
  spend_date DATE NOT NULL,
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  fiscal_month INTEGER,

  -- Classification
  spend_type TEXT NOT NULL CHECK (spend_type IN (
    'contracted', 'non_contracted', 'one_time', 'recurring',
    'committed', 'actual', 'forecasted'
  )),

  -- Details
  description TEXT,
  line_items JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'recorded' CHECK (status IN (
    'recorded', 'verified', 'disputed', 'adjusted', 'voided'
  )),

  -- Audit
  recorded_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spend Aggregations (pre-computed for performance)
CREATE TABLE spend_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Aggregation dimensions
  aggregation_type TEXT NOT NULL CHECK (aggregation_type IN (
    'vendor', 'category', 'contract', 'department', 'time_period'
  )),
  aggregation_period TEXT NOT NULL CHECK (aggregation_period IN (
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all_time'
  )),

  -- Dimension values
  vendor_id UUID REFERENCES vendors(id),
  category_id UUID REFERENCES spend_categories(id),
  contract_id UUID REFERENCES contracts(id),
  department TEXT,
  period_start DATE,
  period_end DATE,

  -- Aggregated values
  total_spend NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_spend_usd NUMERIC(15,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- Breakdowns
  spend_by_type JSONB DEFAULT '{}',  -- {contracted: x, non_contracted: y}
  spend_by_currency JSONB DEFAULT '{}',

  -- Comparisons
  previous_period_spend NUMERIC(15,2),
  period_over_period_change NUMERIC(8,2),  -- Percentage
  budget_allocated NUMERIC(15,2),
  budget_variance NUMERIC(15,2),
  budget_utilization NUMERIC(5,2),

  -- Computed at
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, aggregation_type, aggregation_period, vendor_id, category_id, contract_id, period_start)
);

-- Savings Tracking
CREATE TABLE spend_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Source
  contract_id UUID REFERENCES contracts(id),
  vendor_id UUID REFERENCES vendors(id),
  category_id UUID REFERENCES spend_categories(id),

  -- Savings details
  savings_type TEXT NOT NULL CHECK (savings_type IN (
    'negotiated_discount', 'volume_discount', 'early_payment',
    'contract_consolidation', 'supplier_switch', 'demand_reduction',
    'process_improvement', 'avoided_cost', 'rebate', 'other'
  )),

  -- Amounts
  baseline_amount NUMERIC(15,2) NOT NULL,  -- What it would have cost
  actual_amount NUMERIC(15,2) NOT NULL,  -- What it actually cost
  savings_amount NUMERIC(15,2) GENERATED ALWAYS AS (baseline_amount - actual_amount) STORED,
  savings_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN baseline_amount > 0
    THEN ((baseline_amount - actual_amount) / baseline_amount) * 100
    ELSE 0 END
  ) STORED,
  currency TEXT DEFAULT 'USD',

  -- Period
  savings_date DATE NOT NULL,
  fiscal_year INTEGER,

  -- Classification
  savings_status TEXT DEFAULT 'realized' CHECK (savings_status IN (
    'identified', 'validated', 'realized', 'reported'
  )),
  is_hard_savings BOOLEAN DEFAULT true,  -- Hard vs soft savings

  -- Documentation
  description TEXT,
  evidence_documents JSONB DEFAULT '[]',

  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VENDOR SCORECARDS
-- =====================================================

-- Scorecard Templates (defines scoring dimensions)
CREATE TABLE vendor_scorecard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Applicability
  applies_to_categories TEXT[],  -- Vendor categories
  applies_to_tiers TEXT[],  -- Vendor tiers

  -- Scoring configuration
  scoring_method TEXT DEFAULT 'weighted_average' CHECK (scoring_method IN (
    'weighted_average', 'simple_average', 'minimum_threshold', 'custom'
  )),
  max_score NUMERIC(5,2) DEFAULT 100,
  passing_score NUMERIC(5,2) DEFAULT 70,

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, name)
);

-- Scorecard Dimensions (categories of scoring)
CREATE TABLE scorecard_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES vendor_scorecard_templates(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Dimension type
  dimension_type TEXT NOT NULL CHECK (dimension_type IN (
    'quality', 'delivery', 'cost', 'responsiveness', 'compliance',
    'innovation', 'relationship', 'risk', 'sustainability', 'custom'
  )),

  -- Weighting
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 100),
  max_score NUMERIC(5,2) DEFAULT 100,

  -- Display
  display_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scorecard Metrics (specific KPIs within dimensions)
CREATE TABLE scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id UUID NOT NULL REFERENCES scorecard_dimensions(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  metric_code TEXT,

  -- Metric definition
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'percentage', 'number', 'currency', 'rating', 'boolean', 'days', 'count'
  )),
  unit TEXT,

  -- Scoring rules
  scoring_method TEXT DEFAULT 'linear' CHECK (scoring_method IN (
    'linear', 'threshold', 'inverse', 'custom'
  )),
  target_value NUMERIC(15,2),
  threshold_low NUMERIC(15,2),  -- Below this = 0 points
  threshold_high NUMERIC(15,2),  -- Above this = max points

  -- Weight within dimension
  weight NUMERIC(5,2) DEFAULT 1.0,
  max_score NUMERIC(5,2) DEFAULT 100,

  -- Data source
  data_source TEXT CHECK (data_source IN (
    'manual', 'calculated', 'imported', 'contract_data', 'spend_data',
    'compliance_data', 'survey', 'integration'
  )),
  calculation_formula JSONB,  -- For calculated metrics

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Scorecards (actual scorecard instances)
CREATE TABLE vendor_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES vendor_scorecard_templates(id),

  -- Period
  scorecard_period TEXT NOT NULL CHECK (scorecard_period IN (
    'monthly', 'quarterly', 'semi_annual', 'annual', 'ad_hoc'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Overall scores
  overall_score NUMERIC(5,2),
  overall_rating TEXT CHECK (overall_rating IN (
    'exceptional', 'exceeds_expectations', 'meets_expectations',
    'below_expectations', 'unsatisfactory', 'not_rated'
  )),
  previous_score NUMERIC(5,2),
  score_trend TEXT CHECK (score_trend IN ('improving', 'stable', 'declining')),

  -- Dimension scores
  dimension_scores JSONB DEFAULT '[]',
  -- Example: [
  --   {"dimension_id": "uuid", "name": "Quality", "score": 85, "weight": 30}
  -- ]

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'in_progress', 'pending_review', 'finalized', 'archived'
  )),

  -- Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,

  -- Sharing
  shared_with_vendor BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  vendor_acknowledged BOOLEAN DEFAULT false,
  vendor_acknowledged_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, vendor_id, template_id, period_start)
);

-- Scorecard Metric Values (actual metric scores)
CREATE TABLE scorecard_metric_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES vendor_scorecards(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,

  -- Value
  raw_value NUMERIC(15,2),
  normalized_score NUMERIC(5,2),  -- 0-100 normalized score

  -- Evidence
  evidence_notes TEXT,
  evidence_documents JSONB DEFAULT '[]',

  -- Source
  data_source TEXT,
  source_reference TEXT,

  -- Entry
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(scorecard_id, metric_id)
);

-- Scorecard Action Items
CREATE TABLE scorecard_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES vendor_scorecards(id) ON DELETE CASCADE,
  dimension_id UUID REFERENCES scorecard_dimensions(id),
  metric_id UUID REFERENCES scorecard_metrics(id),

  -- Action details
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  vendor_contact_email TEXT,  -- If action is on vendor
  due_date DATE,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'completed', 'deferred', 'cancelled'
  )),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VENDOR PERFORMANCE METRICS
-- =====================================================

-- Vendor Performance History
CREATE TABLE vendor_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Time period
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Key metrics
  overall_score NUMERIC(5,2),

  -- Spend metrics
  total_spend NUMERIC(15,2),
  spend_growth_rate NUMERIC(8,2),  -- vs previous period
  contract_count INTEGER,
  active_contract_value NUMERIC(15,2),

  -- Quality metrics
  quality_score NUMERIC(5,2),
  defect_rate NUMERIC(8,4),
  return_rate NUMERIC(8,4),

  -- Delivery metrics
  delivery_score NUMERIC(5,2),
  on_time_delivery_rate NUMERIC(5,2),
  average_lead_time_days NUMERIC(8,2),

  -- Cost metrics
  cost_score NUMERIC(5,2),
  price_variance NUMERIC(8,2),  -- vs contract price
  total_savings_realized NUMERIC(15,2),

  -- Compliance metrics
  compliance_score NUMERIC(5,2),
  compliance_issues_count INTEGER,
  certifications_count INTEGER,

  -- Risk metrics
  risk_score NUMERIC(5,2),
  open_risk_issues INTEGER,

  -- Relationship metrics
  responsiveness_score NUMERIC(5,2),
  average_response_time_hours NUMERIC(8,2),
  escalations_count INTEGER,

  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, vendor_id, period_type, period_start)
);

-- Vendor Benchmarks
CREATE TABLE vendor_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Benchmark scope
  vendor_category TEXT,  -- NULL = all vendors
  metric_name TEXT NOT NULL,

  -- Time period
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,

  -- Benchmark values
  average_value NUMERIC(15,2),
  median_value NUMERIC(15,2),
  percentile_25 NUMERIC(15,2),
  percentile_75 NUMERIC(15,2),
  percentile_90 NUMERIC(15,2),
  min_value NUMERIC(15,2),
  max_value NUMERIC(15,2),
  sample_size INTEGER,

  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, vendor_category, metric_name, period_type, period_start)
);

-- =====================================================
-- SPEND ANALYTICS VIEWS
-- =====================================================

-- Monthly Spend Summary View
CREATE OR REPLACE VIEW v_monthly_spend_summary AS
SELECT
  sr.enterprise_id,
  DATE_TRUNC('month', sr.spend_date)::date as month,
  sr.vendor_id,
  v.name as vendor_name,
  sr.category_id,
  sc.name as category_name,
  sr.currency,
  SUM(sr.amount) as total_spend,
  SUM(sr.amount_usd) as total_spend_usd,
  COUNT(*) as transaction_count,
  AVG(sr.amount) as avg_transaction_amount
FROM spend_records sr
LEFT JOIN vendors v ON v.id = sr.vendor_id
LEFT JOIN spend_categories sc ON sc.id = sr.category_id
WHERE sr.status != 'voided'
GROUP BY
  sr.enterprise_id,
  DATE_TRUNC('month', sr.spend_date),
  sr.vendor_id, v.name,
  sr.category_id, sc.name,
  sr.currency;

-- Vendor Spend Ranking View
CREATE OR REPLACE VIEW v_vendor_spend_ranking AS
SELECT
  sr.enterprise_id,
  sr.vendor_id,
  v.name as vendor_name,
  v.category as vendor_category,
  SUM(sr.amount_usd) as total_spend_usd,
  COUNT(DISTINCT sr.contract_id) as contract_count,
  COUNT(*) as transaction_count,
  RANK() OVER (PARTITION BY sr.enterprise_id ORDER BY SUM(sr.amount_usd) DESC) as spend_rank,
  SUM(sr.amount_usd) * 100.0 / SUM(SUM(sr.amount_usd)) OVER (PARTITION BY sr.enterprise_id) as spend_share_pct
FROM spend_records sr
JOIN vendors v ON v.id = sr.vendor_id
WHERE sr.status != 'voided'
  AND sr.spend_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY sr.enterprise_id, sr.vendor_id, v.name, v.category;

-- =====================================================
-- INDEXES
-- =====================================================

-- Spend category indexes
CREATE INDEX idx_spend_categories_enterprise ON spend_categories(enterprise_id);
CREATE INDEX idx_spend_categories_parent ON spend_categories(parent_category_id);
CREATE INDEX idx_spend_categories_type ON spend_categories(category_type);

-- Spend record indexes
CREATE INDEX idx_spend_records_enterprise ON spend_records(enterprise_id);
CREATE INDEX idx_spend_records_vendor ON spend_records(vendor_id);
CREATE INDEX idx_spend_records_contract ON spend_records(contract_id);
CREATE INDEX idx_spend_records_category ON spend_records(category_id);
CREATE INDEX idx_spend_records_date ON spend_records(spend_date);
CREATE INDEX idx_spend_records_fiscal ON spend_records(fiscal_year, fiscal_quarter);

-- Aggregation indexes
CREATE INDEX idx_spend_aggregations_enterprise ON spend_aggregations(enterprise_id);
CREATE INDEX idx_spend_aggregations_vendor ON spend_aggregations(vendor_id);
CREATE INDEX idx_spend_aggregations_period ON spend_aggregations(period_start, period_end);
CREATE INDEX idx_spend_aggregations_type ON spend_aggregations(aggregation_type, aggregation_period);

-- Savings indexes
CREATE INDEX idx_spend_savings_enterprise ON spend_savings(enterprise_id);
CREATE INDEX idx_spend_savings_vendor ON spend_savings(vendor_id);
CREATE INDEX idx_spend_savings_contract ON spend_savings(contract_id);
CREATE INDEX idx_spend_savings_date ON spend_savings(savings_date);
CREATE INDEX idx_spend_savings_fiscal ON spend_savings(fiscal_year);

-- Scorecard indexes
CREATE INDEX idx_scorecard_templates_enterprise ON vendor_scorecard_templates(enterprise_id);
CREATE INDEX idx_scorecard_dimensions_template ON scorecard_dimensions(template_id);
CREATE INDEX idx_scorecard_metrics_dimension ON scorecard_metrics(dimension_id);
CREATE INDEX idx_vendor_scorecards_enterprise ON vendor_scorecards(enterprise_id);
CREATE INDEX idx_vendor_scorecards_vendor ON vendor_scorecards(vendor_id);
CREATE INDEX idx_vendor_scorecards_period ON vendor_scorecards(period_start, period_end);
CREATE INDEX idx_vendor_scorecards_status ON vendor_scorecards(status);
CREATE INDEX idx_scorecard_metric_values_scorecard ON scorecard_metric_values(scorecard_id);
CREATE INDEX idx_scorecard_action_items_scorecard ON scorecard_action_items(scorecard_id);

-- Performance history indexes
CREATE INDEX idx_vendor_performance_enterprise ON vendor_performance_history(enterprise_id);
CREATE INDEX idx_vendor_performance_vendor ON vendor_performance_history(vendor_id);
CREATE INDEX idx_vendor_performance_period ON vendor_performance_history(period_start, period_end);
CREATE INDEX idx_vendor_benchmarks_enterprise ON vendor_benchmarks(enterprise_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE spend_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_benchmarks ENABLE ROW LEVEL SECURITY;

-- Enterprise isolation policies
CREATE POLICY spend_categories_isolation ON spend_categories
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY spend_records_isolation ON spend_records
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY spend_aggregations_isolation ON spend_aggregations
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY spend_savings_isolation ON spend_savings
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY scorecard_templates_isolation ON vendor_scorecard_templates
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY scorecard_dimensions_isolation ON scorecard_dimensions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendor_scorecard_templates t
      WHERE t.id = scorecard_dimensions.template_id
      AND t.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY scorecard_metrics_isolation ON scorecard_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scorecard_dimensions d
      JOIN vendor_scorecard_templates t ON t.id = d.template_id
      WHERE d.id = scorecard_metrics.dimension_id
      AND t.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY vendor_scorecards_isolation ON vendor_scorecards
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY scorecard_metric_values_isolation ON scorecard_metric_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendor_scorecards s
      WHERE s.id = scorecard_metric_values.scorecard_id
      AND s.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY scorecard_action_items_isolation ON scorecard_action_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM vendor_scorecards s
      WHERE s.id = scorecard_action_items.scorecard_id
      AND s.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY vendor_performance_isolation ON vendor_performance_history
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY vendor_benchmarks_isolation ON vendor_benchmarks
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Record spend entry
CREATE OR REPLACE FUNCTION record_spend(
  p_enterprise_id UUID,
  p_vendor_id UUID,
  p_contract_id UUID,
  p_category_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_spend_date DATE,
  p_spend_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_amount_usd NUMERIC;
  v_exchange_rate NUMERIC := 1.0;
  v_fiscal_year INTEGER;
  v_fiscal_quarter INTEGER;
  v_fiscal_month INTEGER;
BEGIN
  -- Simple USD conversion (in production, use exchange rate table)
  IF p_currency = 'USD' THEN
    v_amount_usd := p_amount;
  ELSE
    v_amount_usd := p_amount;  -- Would apply real exchange rate
  END IF;

  -- Calculate fiscal periods (assuming calendar year)
  v_fiscal_year := EXTRACT(YEAR FROM p_spend_date);
  v_fiscal_quarter := EXTRACT(QUARTER FROM p_spend_date);
  v_fiscal_month := EXTRACT(MONTH FROM p_spend_date);

  INSERT INTO spend_records (
    enterprise_id, vendor_id, contract_id, category_id,
    amount, currency, amount_usd, exchange_rate,
    spend_date, fiscal_year, fiscal_quarter, fiscal_month,
    spend_type, description, recorded_by
  ) VALUES (
    p_enterprise_id, p_vendor_id, p_contract_id, p_category_id,
    p_amount, p_currency, v_amount_usd, v_exchange_rate,
    p_spend_date, v_fiscal_year, v_fiscal_quarter, v_fiscal_month,
    p_spend_type, p_description, p_recorded_by
  )
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute spend aggregations
CREATE OR REPLACE FUNCTION compute_spend_aggregations(
  p_enterprise_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_start DATE;
  v_end DATE;
BEGIN
  -- Default to current month if not specified
  v_start := COALESCE(p_period_start, DATE_TRUNC('month', CURRENT_DATE)::date);
  v_end := COALESCE(p_period_end, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date);

  -- Delete existing aggregations for this period
  DELETE FROM spend_aggregations
  WHERE enterprise_id = p_enterprise_id
    AND period_start = v_start;

  -- Vendor aggregations
  INSERT INTO spend_aggregations (
    enterprise_id, aggregation_type, aggregation_period,
    vendor_id, period_start, period_end,
    total_spend, total_spend_usd, transaction_count
  )
  SELECT
    p_enterprise_id,
    'vendor',
    'monthly',
    vendor_id,
    v_start,
    v_end,
    SUM(amount),
    SUM(amount_usd),
    COUNT(*)
  FROM spend_records
  WHERE enterprise_id = p_enterprise_id
    AND spend_date BETWEEN v_start AND v_end
    AND status != 'voided'
    AND vendor_id IS NOT NULL
  GROUP BY vendor_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Category aggregations
  INSERT INTO spend_aggregations (
    enterprise_id, aggregation_type, aggregation_period,
    category_id, period_start, period_end,
    total_spend, total_spend_usd, transaction_count
  )
  SELECT
    p_enterprise_id,
    'category',
    'monthly',
    category_id,
    v_start,
    v_end,
    SUM(amount),
    SUM(amount_usd),
    COUNT(*)
  FROM spend_records
  WHERE enterprise_id = p_enterprise_id
    AND spend_date BETWEEN v_start AND v_end
    AND status != 'voided'
    AND category_id IS NOT NULL
  GROUP BY category_id;

  GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record savings
CREATE OR REPLACE FUNCTION record_savings(
  p_enterprise_id UUID,
  p_vendor_id UUID,
  p_contract_id UUID,
  p_savings_type TEXT,
  p_baseline_amount NUMERIC,
  p_actual_amount NUMERIC,
  p_savings_date DATE,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_savings_id UUID;
  v_fiscal_year INTEGER;
BEGIN
  v_fiscal_year := EXTRACT(YEAR FROM p_savings_date);

  INSERT INTO spend_savings (
    enterprise_id, vendor_id, contract_id,
    savings_type, baseline_amount, actual_amount,
    savings_date, fiscal_year, description, created_by
  ) VALUES (
    p_enterprise_id, p_vendor_id, p_contract_id,
    p_savings_type, p_baseline_amount, p_actual_amount,
    p_savings_date, v_fiscal_year, p_description, p_created_by
  )
  RETURNING id INTO v_savings_id;

  RETURN v_savings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create vendor scorecard
CREATE OR REPLACE FUNCTION create_vendor_scorecard(
  p_enterprise_id UUID,
  p_vendor_id UUID,
  p_template_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_scorecard_id UUID;
  v_template RECORD;
  v_period TEXT;
  v_previous_score NUMERIC;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM vendor_scorecard_templates
  WHERE id = p_template_id;

  -- Determine period type
  v_period := CASE
    WHEN (p_period_end - p_period_start) <= 35 THEN 'monthly'
    WHEN (p_period_end - p_period_start) <= 95 THEN 'quarterly'
    WHEN (p_period_end - p_period_start) <= 190 THEN 'semi_annual'
    ELSE 'annual'
  END;

  -- Get previous score
  SELECT overall_score INTO v_previous_score
  FROM vendor_scorecards
  WHERE vendor_id = p_vendor_id
    AND template_id = p_template_id
    AND status = 'finalized'
  ORDER BY period_end DESC
  LIMIT 1;

  -- Create scorecard
  INSERT INTO vendor_scorecards (
    enterprise_id, vendor_id, template_id,
    scorecard_period, period_start, period_end,
    previous_score, created_by
  ) VALUES (
    p_enterprise_id, p_vendor_id, p_template_id,
    v_period, p_period_start, p_period_end,
    v_previous_score, p_created_by
  )
  RETURNING id INTO v_scorecard_id;

  -- Initialize metric values
  INSERT INTO scorecard_metric_values (scorecard_id, metric_id)
  SELECT v_scorecard_id, m.id
  FROM scorecard_metrics m
  JOIN scorecard_dimensions d ON d.id = m.dimension_id
  WHERE d.template_id = p_template_id
    AND m.is_active = true;

  RETURN v_scorecard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate scorecard scores
CREATE OR REPLACE FUNCTION calculate_scorecard_scores(p_scorecard_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_scorecard RECORD;
  v_dimension RECORD;
  v_dimension_scores JSONB := '[]'::jsonb;
  v_total_weighted_score NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_overall_score NUMERIC;
  v_score_trend TEXT;
BEGIN
  -- Get scorecard
  SELECT * INTO v_scorecard
  FROM vendor_scorecards WHERE id = p_scorecard_id;

  -- Calculate dimension scores
  FOR v_dimension IN
    SELECT
      d.id,
      d.name,
      d.weight,
      d.max_score,
      COALESCE(
        SUM(mv.normalized_score * m.weight) / NULLIF(SUM(m.weight), 0),
        0
      ) as dimension_score
    FROM scorecard_dimensions d
    JOIN scorecard_metrics m ON m.dimension_id = d.id AND m.is_active = true
    LEFT JOIN scorecard_metric_values mv ON mv.metric_id = m.id AND mv.scorecard_id = p_scorecard_id
    WHERE d.template_id = v_scorecard.template_id AND d.is_active = true
    GROUP BY d.id, d.name, d.weight, d.max_score
  LOOP
    v_dimension_scores := v_dimension_scores || jsonb_build_object(
      'dimension_id', v_dimension.id,
      'name', v_dimension.name,
      'score', ROUND(v_dimension.dimension_score, 2),
      'weight', v_dimension.weight
    );

    v_total_weighted_score := v_total_weighted_score + (v_dimension.dimension_score * v_dimension.weight);
    v_total_weight := v_total_weight + v_dimension.weight;
  END LOOP;

  -- Calculate overall score
  IF v_total_weight > 0 THEN
    v_overall_score := v_total_weighted_score / v_total_weight;
  ELSE
    v_overall_score := 0;
  END IF;

  -- Determine trend
  IF v_scorecard.previous_score IS NULL THEN
    v_score_trend := 'stable';
  ELSIF v_overall_score > v_scorecard.previous_score + 5 THEN
    v_score_trend := 'improving';
  ELSIF v_overall_score < v_scorecard.previous_score - 5 THEN
    v_score_trend := 'declining';
  ELSE
    v_score_trend := 'stable';
  END IF;

  -- Update scorecard
  UPDATE vendor_scorecards
  SET
    overall_score = ROUND(v_overall_score, 2),
    overall_rating = CASE
      WHEN v_overall_score >= 90 THEN 'exceptional'
      WHEN v_overall_score >= 80 THEN 'exceeds_expectations'
      WHEN v_overall_score >= 70 THEN 'meets_expectations'
      WHEN v_overall_score >= 50 THEN 'below_expectations'
      ELSE 'unsatisfactory'
    END,
    score_trend = v_score_trend,
    dimension_scores = v_dimension_scores,
    updated_at = NOW()
  WHERE id = p_scorecard_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finalize scorecard
CREATE OR REPLACE FUNCTION finalize_scorecard(
  p_scorecard_id UUID,
  p_reviewed_by UUID,
  p_review_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_scorecard RECORD;
BEGIN
  -- Calculate final scores
  PERFORM calculate_scorecard_scores(p_scorecard_id);

  -- Get scorecard
  SELECT * INTO v_scorecard
  FROM vendor_scorecards WHERE id = p_scorecard_id;

  -- Update status
  UPDATE vendor_scorecards
  SET
    status = 'finalized',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    review_comments = p_review_comments,
    updated_at = NOW()
  WHERE id = p_scorecard_id;

  -- Update vendor overall rating
  UPDATE vendors
  SET
    overall_rating = v_scorecard.overall_score,
    updated_at = NOW()
  WHERE id = v_scorecard.vendor_id;

  -- Record in performance history
  INSERT INTO vendor_performance_history (
    enterprise_id, vendor_id,
    period_type, period_start, period_end,
    overall_score
  )
  SELECT
    v_scorecard.enterprise_id,
    v_scorecard.vendor_id,
    v_scorecard.scorecard_period,
    v_scorecard.period_start,
    v_scorecard.period_end,
    v_scorecard.overall_score
  ON CONFLICT (enterprise_id, vendor_id, period_type, period_start)
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    computed_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get vendor spend summary
CREATE OR REPLACE FUNCTION get_vendor_spend_summary(
  p_vendor_id UUID,
  p_period_months INTEGER DEFAULT 12
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_spend', COALESCE(SUM(amount_usd), 0),
    'transaction_count', COUNT(*),
    'contract_count', COUNT(DISTINCT contract_id),
    'avg_transaction', COALESCE(AVG(amount_usd), 0),
    'spend_by_category', (
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', category_id,
        'category_name', sc.name,
        'amount', cat_spend
      ))
      FROM (
        SELECT sr2.category_id, SUM(sr2.amount_usd) as cat_spend
        FROM spend_records sr2
        WHERE sr2.vendor_id = p_vendor_id
          AND sr2.spend_date >= CURRENT_DATE - (p_period_months || ' months')::interval
          AND sr2.status != 'voided'
        GROUP BY sr2.category_id
      ) cat
      LEFT JOIN spend_categories sc ON sc.id = cat.category_id
    ),
    'monthly_trend', (
      SELECT jsonb_agg(jsonb_build_object(
        'month', to_char(month, 'YYYY-MM'),
        'amount', month_spend
      ) ORDER BY month)
      FROM (
        SELECT DATE_TRUNC('month', sr2.spend_date)::date as month, SUM(sr2.amount_usd) as month_spend
        FROM spend_records sr2
        WHERE sr2.vendor_id = p_vendor_id
          AND sr2.spend_date >= CURRENT_DATE - (p_period_months || ' months')::interval
          AND sr2.status != 'voided'
        GROUP BY DATE_TRUNC('month', sr2.spend_date)
      ) monthly
    ),
    'total_savings', (
      SELECT COALESCE(SUM(savings_amount), 0)
      FROM spend_savings
      WHERE vendor_id = p_vendor_id
        AND savings_date >= CURRENT_DATE - (p_period_months || ' months')::interval
    )
  ) INTO v_result
  FROM spend_records sr
  WHERE sr.vendor_id = p_vendor_id
    AND sr.spend_date >= CURRENT_DATE - (p_period_months || ' months')::interval
    AND sr.status != 'voided';

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get spend analytics dashboard data
CREATE OR REPLACE FUNCTION get_spend_analytics_dashboard(
  p_enterprise_id UUID,
  p_period_months INTEGER DEFAULT 12
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_period_start DATE;
BEGIN
  v_period_start := CURRENT_DATE - (p_period_months || ' months')::interval;

  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_spend', COALESCE(SUM(amount_usd), 0),
      'contracted_spend', COALESCE(SUM(CASE WHEN spend_type = 'contracted' THEN amount_usd END), 0),
      'non_contracted_spend', COALESCE(SUM(CASE WHEN spend_type = 'non_contracted' THEN amount_usd END), 0),
      'transaction_count', COUNT(*),
      'vendor_count', COUNT(DISTINCT vendor_id),
      'contract_count', COUNT(DISTINCT contract_id)
    ),
    'top_vendors', (
      SELECT jsonb_agg(vendor_data ORDER BY spend DESC)
      FROM (
        SELECT jsonb_build_object(
          'vendor_id', sr2.vendor_id,
          'vendor_name', v.name,
          'spend', SUM(sr2.amount_usd),
          'share_pct', SUM(sr2.amount_usd) * 100.0 / NULLIF(SUM(SUM(sr2.amount_usd)) OVER (), 0)
        ) as vendor_data,
        SUM(sr2.amount_usd) as spend
        FROM spend_records sr2
        JOIN vendors v ON v.id = sr2.vendor_id
        WHERE sr2.enterprise_id = p_enterprise_id
          AND sr2.spend_date >= v_period_start
          AND sr2.status != 'voided'
        GROUP BY sr2.vendor_id, v.name
        ORDER BY SUM(sr2.amount_usd) DESC
        LIMIT 10
      ) top
    ),
    'spend_by_category', (
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', category_id,
        'category_name', sc.name,
        'category_type', sc.category_type,
        'spend', cat_spend
      ))
      FROM (
        SELECT sr2.category_id, SUM(sr2.amount_usd) as cat_spend
        FROM spend_records sr2
        WHERE sr2.enterprise_id = p_enterprise_id
          AND sr2.spend_date >= v_period_start
          AND sr2.status != 'voided'
        GROUP BY sr2.category_id
      ) cat
      LEFT JOIN spend_categories sc ON sc.id = cat.category_id
    ),
    'monthly_trend', (
      SELECT jsonb_agg(jsonb_build_object(
        'month', to_char(month, 'YYYY-MM'),
        'total_spend', total,
        'contracted', contracted,
        'non_contracted', non_contracted
      ) ORDER BY month)
      FROM (
        SELECT
          DATE_TRUNC('month', sr2.spend_date)::date as month,
          SUM(sr2.amount_usd) as total,
          SUM(CASE WHEN sr2.spend_type = 'contracted' THEN sr2.amount_usd ELSE 0 END) as contracted,
          SUM(CASE WHEN sr2.spend_type = 'non_contracted' THEN sr2.amount_usd ELSE 0 END) as non_contracted
        FROM spend_records sr2
        WHERE sr2.enterprise_id = p_enterprise_id
          AND sr2.spend_date >= v_period_start
          AND sr2.status != 'voided'
        GROUP BY DATE_TRUNC('month', sr2.spend_date)
      ) monthly
    ),
    'total_savings', (
      SELECT COALESCE(SUM(savings_amount), 0)
      FROM spend_savings
      WHERE enterprise_id = p_enterprise_id
        AND savings_date >= v_period_start
    ),
    'savings_by_type', (
      SELECT jsonb_agg(jsonb_build_object(
        'type', savings_type,
        'amount', total_savings
      ))
      FROM (
        SELECT savings_type, SUM(savings_amount) as total_savings
        FROM spend_savings
        WHERE enterprise_id = p_enterprise_id
          AND savings_date >= v_period_start
        GROUP BY savings_type
      ) savings
    )
  ) INTO v_result
  FROM spend_records sr
  WHERE sr.enterprise_id = p_enterprise_id
    AND sr.spend_date >= v_period_start
    AND sr.status != 'voided';

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_spend_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spend_categories_timestamp
  BEFORE UPDATE ON spend_categories
  FOR EACH ROW EXECUTE FUNCTION update_spend_updated_at();

CREATE TRIGGER update_spend_records_timestamp
  BEFORE UPDATE ON spend_records
  FOR EACH ROW EXECUTE FUNCTION update_spend_updated_at();

CREATE TRIGGER update_scorecard_templates_timestamp
  BEFORE UPDATE ON vendor_scorecard_templates
  FOR EACH ROW EXECUTE FUNCTION update_spend_updated_at();

CREATE TRIGGER update_vendor_scorecards_timestamp
  BEFORE UPDATE ON vendor_scorecards
  FOR EACH ROW EXECUTE FUNCTION update_spend_updated_at();

CREATE TRIGGER update_scorecard_action_items_timestamp
  BEFORE UPDATE ON scorecard_action_items
  FOR EACH ROW EXECUTE FUNCTION update_spend_updated_at();

COMMENT ON TABLE spend_categories IS 'Hierarchical spend categorization';
COMMENT ON TABLE spend_records IS 'Individual spend transactions';
COMMENT ON TABLE spend_aggregations IS 'Pre-computed spend aggregations for analytics';
COMMENT ON TABLE spend_savings IS 'Tracked cost savings from procurement activities';
COMMENT ON TABLE vendor_scorecard_templates IS 'Templates defining scorecard structure';
COMMENT ON TABLE vendor_scorecards IS 'Vendor performance scorecards';
COMMENT ON TABLE vendor_performance_history IS 'Historical vendor performance metrics';
