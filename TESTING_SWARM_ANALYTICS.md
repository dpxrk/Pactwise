# Testing Guide: Swarm Analytics Dashboard

Complete guide for testing the swarm intelligence analytics dashboard and backend integration.

---

## Prerequisites

1. **Docker Running**: Ensure Docker Desktop is running (WSL2 backend on Windows)
2. **Services Started**:
   ```bash
   cd backend
   npx supabase start

   cd ../frontend
   npm run dev
   ```

3. **Browser**: Chrome/Firefox with DevTools for network inspection

---

## Step 1: Insert Test Data

### Option A: Using Supabase Studio (Recommended)

1. Open Supabase Studio: http://127.0.0.1:54323
2. Navigate to **SQL Editor**
3. Paste the following SQL:

```sql
-- Get the first enterprise ID from your database
DO $$
DECLARE
  test_ent_id UUID;
BEGIN
  -- Get existing enterprise
  SELECT id INTO test_ent_id FROM enterprises LIMIT 1;

  IF test_ent_id IS NULL THEN
    RAISE EXCEPTION 'No enterprises found. Create one first.';
  END IF;

  -- Insert agent performance history (PSO metrics)
  INSERT INTO agent_performance_history (enterprise_id, agent_type, request_type, success, confidence, duration_ms, request_signature)
  VALUES
    (test_ent_id, 'legal', 'contract_review', true, 0.95, 2300, '{"complexity": "high"}'::jsonb),
    (test_ent_id, 'financial', 'financial_analysis', true, 0.89, 1800, '{"complexity": "medium"}'::jsonb),
    (test_ent_id, 'compliance', 'compliance_check', true, 0.92, 1500, '{"complexity": "medium"}'::jsonb),
    (test_ent_id, 'legal', 'contract_review', true, 0.88, 2100, '{"complexity": "high"}'::jsonb),
    (test_ent_id, 'secretary', 'document_extraction', true, 0.94, 800, '{"complexity": "low"}'::jsonb),
    (test_ent_id, 'manager', 'workflow_orchestration', true, 0.90, 3200, '{"complexity": "high"}'::jsonb),
    (test_ent_id, 'vendor', 'vendor_assessment', true, 0.87, 1900, '{"complexity": "medium"}'::jsonb),
    (test_ent_id, 'analytics', 'data_analysis', true, 0.91, 2500, '{"complexity": "high"}'::jsonb),
    (test_ent_id, 'risk-assessment', 'risk_analysis', true, 0.93, 1700, '{"complexity": "medium"}'::jsonb),
    (test_ent_id, 'notifications', 'alert_generation', true, 0.96, 600, '{"complexity": "low"}'::jsonb);

  -- Insert pheromone trails (ACO metrics)
  INSERT INTO agent_pheromones (enterprise_id, field_id, position, pheromone_type, strength, reinforcement_count)
  VALUES
    (test_ent_id, 'secretary→legal→manager', '{"sequence": ["secretary", "legal", "manager"]}'::jsonb, 'trail', 8.7, 23),
    (test_ent_id, 'legal→financial→manager', '{"sequence": ["legal", "financial", "manager"]}'::jsonb, 'trail', 9.2, 31),
    (test_ent_id, 'secretary→compliance→manager', '{"sequence": ["secretary", "compliance", "manager"]}'::jsonb, 'trail', 7.5, 18),
    (test_ent_id, 'vendor→financial→legal', '{"sequence": ["vendor", "financial", "legal"]}'::jsonb, 'trail', 8.1, 22);

  -- Insert swarm patterns
  INSERT INTO agent_swarm_patterns (
    enterprise_id, pattern_type, name, description, request_signature,
    agent_sequence, success_rate, avg_confidence, avg_duration_ms, usage_count, emergence_score, last_used_at
  )
  VALUES
    (test_ent_id, 'sequential', 'Contract Review', 'Standard contract review workflow',
     '{"type": "contract_review"}'::jsonb, ARRAY['secretary', 'legal', 'financial', 'manager'],
     0.94, 0.91, 5800, 45, 0.87, NOW()),
    (test_ent_id, 'sequential', 'Vendor Onboarding', 'Vendor assessment process',
     '{"type": "vendor"}'::jsonb, ARRAY['vendor', 'financial', 'compliance', 'manager'],
     0.89, 0.88, 7200, 32, 0.82, NOW());

  RAISE NOTICE 'Test data inserted for enterprise: %', test_ent_id;
END $$;
```

4. Click **Run** (or press Ctrl+Enter)
5. Check for success message in output

### Option B: Using Supabase CLI (If psql installed)

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 54322 \
  -U postgres \
  -d postgres \
  -c "SELECT id FROM enterprises LIMIT 1;"

# Copy the enterprise ID, then run insert script with that ID
```

---

## Step 2: Access the Dashboard

1. **Open Browser**: Navigate to http://localhost:3000
2. **Login**: Use your test account credentials
3. **Go to Agents**: Click "Agents" in sidebar navigation
4. **Open Swarm Analytics**:
   - Either click the dedicated link/button (if added)
   - Or navigate directly to: http://localhost:3000/dashboard/agents/swarm-analytics

---

## Step 3: Verify Dashboard Loads

### Expected UI Elements

1. **Header**:
   - Title: "Swarm Analytics Dashboard"
   - Subtitle: "Real-time swarm intelligence performance monitoring"
   - Back button to main agents page

2. **Capabilities Sidebar** (Left, 1/3 width):
   - 5 capability cards:
     - Swarm Health (Activity icon)
     - PSO Analysis (TrendingUp icon)
     - ACO Analytics (GitBranch icon)
     - Consensus Stats (Users icon)
     - Agent Patterns (Network icon)

3. **Results Panel** (Right, 2/3 width):
   - Selected capability content
   - Real-time metrics with numbers
   - Charts and visualizations

4. **Debug Panel** (Bottom-right, optional):
   - If `NEXT_PUBLIC_SWARM_DEBUG=true`, shows SwarmDebugPanel
   - Live algorithm visualization

### Expected Data (Swarm Health View)

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| AVG OPTIMIZATION TIME | ~1,850ms | Average of inserted duration_ms values |
| CONSENSUS SUCCESS | 100% | All test records have success=true |
| PATTERN REUSE | ~770% | (45+32) / 10 records |
| TOTAL OPTIMIZATIONS | 10 | Number of inserted performance records |

---

## Step 4: Test API Integration

### Browser DevTools Inspection

1. **Open DevTools**: Press F12 or Ctrl+Shift+I
2. **Network Tab**: Filter by "Fetch/XHR"
3. **Look for Request**:
   - Name: `swarm-metrics`
   - Method: `POST`
   - URL: `/functions/v1/swarm-metrics`
   - Status: `200 OK`

4. **Inspect Request Payload**:
   ```json
   {
     "enterpriseId": "your-enterprise-uuid",
     "timeRange": "24h"
   }
   ```

5. **Inspect Response**:
   ```json
   {
     "totalOptimizations": 10,
     "averageOptimizationTime": 1850,
     "consensusSuccessRate": 1.0,
     "patternReuseRate": 7.7,
     "psoMetrics": { ... },
     "acoMetrics": { ... },
     "consensusMetrics": { ... },
     "collaborationPatterns": { ... }
   }
   ```

### Console Verification

Open browser console and run:

```javascript
// Should show no errors related to swarm-metrics
console.log('Swarm metrics loaded successfully');
```

---

## Step 5: Test Each Capability View

Click through each capability in the sidebar and verify:

### 1. Swarm Health ✓
- Shows 4 metric cards (optimization time, consensus, pattern reuse, total)
- Health badges display (Optimal/Good/Needs Attention)
- System status shows 4 checkmarks (PSO, ACO, Consensus, Pattern Learning)

### 2. PSO Analysis ✓
- Shows PSO performance metrics (4 cards)
- Convergence history table/chart (if data available)
- Particle count: 20
- Average iterations: calculated value

### 3. ACO Analytics ✓
- Pheromone trails list (top 10 by strength)
- Each trail shows:
  - Path (e.g., "secretary→legal→manager")
  - Strength bar (visual indicator)
  - Success count badge
- ACO metrics: avg path length, best path quality

### 4. Consensus Stats ✓
- Consensus distribution chart (5 buckets: 50-60%, 60-70%, etc.)
- Average agreement score
- Minority opinion rate

### 5. Agent Patterns ✓
- Most frequent agent pairs list
- Collaboration strength visualization
- Success rate per edge

---

## Step 6: Test Auto-Refresh

The dashboard auto-refreshes every 30 seconds.

**Test Procedure**:
1. Note current "TOTAL OPTIMIZATIONS" count
2. Insert a new performance record:
   ```sql
   INSERT INTO agent_performance_history (
     enterprise_id, agent_type, request_type, success, confidence, duration_ms
   )
   SELECT id, 'legal', 'test_query', true, 0.88, 1200
   FROM enterprises LIMIT 1;
   ```
3. Wait 30 seconds
4. Verify count increases by 1

---

## Step 7: Test Time Range Filters (Future)

Currently, timeRange is hardcoded to '24h'. To test different ranges:

1. Modify `useSwarmMetrics()` call in page component
2. Pass `timeRange: '1h'` or `'7d'` or `'30d'`
3. Verify query adjusts `executed_at` filter

---

## Troubleshooting

### Dashboard Shows "Loading..." Forever

**Possible Causes**:
1. Edge runtime not started
   - Check: `npx supabase status` - look for `supabase_edge_runtime_pactwise`
   - Fix: Edge functions may need manual deployment

2. Authentication issue
   - Check browser console for 401/403 errors
   - Fix: Ensure you're logged in and enterprise_id matches

3. No data in tables
   - Check: Run `SELECT COUNT(*) FROM agent_performance_history;`
   - Fix: Insert test data (Step 1)

### Error: "Failed to fetch swarm metrics"

**Check**:
1. Backend logs: `npx supabase functions serve`
2. Network tab: Response body shows error details
3. Database: RLS policies allow access to your enterprise

**Common Fixes**:
- Ensure user's enterprise_id matches data in tables
- Check RLS policy: `enterprise_id IN (SELECT enterprise_id FROM enterprise_users WHERE user_id = auth.uid())`

### Shows Empty State or Zero Metrics

**Verify Data Exists**:
```sql
SELECT
  (SELECT COUNT(*) FROM agent_performance_history) as perf_count,
  (SELECT COUNT(*) FROM agent_pheromones) as pheromone_count,
  (SELECT COUNT(*) FROM agent_swarm_patterns) as pattern_count;
```

If all zero, re-run Step 1 test data insertion.

### TypeScript Errors in Console

**Check**:
- `npm run typecheck` passes
- Types match between SwarmMetrics interface (hook) and backend response
- Response is properly typed in `agentsAPI.getSwarmMetrics()`

---

## Performance Benchmarks

Expected load times:
- Initial page load: <2 seconds
- Metrics fetch: <500ms
- Auto-refresh: <200ms (cached)
- Capability switch: Instant (React state)

If slower:
- Check database indexes (should exist from migration 139)
- Verify no N+1 queries (use DevTools Network waterfall)
- Consider adding materialized views for expensive aggregations

---

## Production Deployment Notes

When deploying to production:

1. **Edge Function Deployment**:
   ```bash
   npx supabase functions deploy swarm-metrics
   ```

2. **Environment Variables**:
   - Set `NEXT_PUBLIC_SUPABASE_URL` to production URL
   - Ensure `NEXT_PUBLIC_SWARM_DEBUG=false` in production

3. **Database Seeding**:
   - Real swarm data accumulates naturally from agent usage
   - No manual seeding needed
   - Consider cron job for pheromone evaporation (already in migration)

4. **Monitoring**:
   - Set up alerts for failed metrics fetches
   - Monitor query performance (execution time)
   - Track API usage (rate limiting)

---

## Next Steps

After successful testing:

1. **Add Navigation Link**: Update main agents page with link to analytics
2. **Real-time Updates**: Replace polling with Supabase Realtime subscriptions
3. **Export Functionality**: Add CSV/PDF export for reports
4. **Historical Trends**: Implement time-series charts with recharts/victory
5. **Alerts**: Add threshold-based alerts (e.g., consensus rate drops below 85%)

---

## Appendix: Sample cURL Test (Bypass Frontend)

If edge runtime is running:

```bash
# Get your JWT token from browser localStorage
TOKEN="your-jwt-token-here"

curl -X POST http://127.0.0.1:54321/functions/v1/swarm-metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseId": "your-enterprise-uuid",
    "timeRange": "24h"
  }' | jq
```

Expected output: Full SwarmMetrics JSON object

---

## Success Criteria

✅ Dashboard loads without errors
✅ All 5 capability views render correctly
✅ Metrics display real data from database
✅ API call completes in <500ms
✅ Auto-refresh works every 30 seconds
✅ No TypeScript errors
✅ No console warnings/errors
✅ Health badges show correct status
✅ Charts/visualizations display properly

---

**Last Updated**: 2026-02-08
**Version**: 1.0.0
