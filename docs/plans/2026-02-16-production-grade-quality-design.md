# Production-Grade Quality Implementation Design

**Date:** February 16, 2026
**Target:** Data Integrity 100/100, Stability 95/100, UX 95/100
**Timeline:** 10-12 days (2 weeks with buffer)
**Status:** Approved for implementation

---

## Executive Summary

This design raises Pactwise from current scores (Data Integrity: 90, Stability: 75, UX: 80) to production-grade targets (100, 95, 95) through comprehensive, systematic improvements across three parallel tracks.

**Approach:** Infrastructure-first philosophy - build reusable patterns that raise entire platform quality rather than one-off fixes.

**Key Deliverables:**
1. Transaction management layer for 100% data consistency
2. Error handling framework with recovery patterns
3. Loading/error/empty state system
4. Full WCAG 2.1 AA accessibility compliance
5. Four reusable audit skills for future use

---

## Overall Architecture

### Three Parallel Workstreams

**1. Data Integrity Track (Backend-focused) → 100/100**
- Transaction management layer for all edge functions
- Database-level validation and constraints
- Audit trail infrastructure
- Orphan record prevention

**2. Stability Track (Full-stack) → 95/100**
- Comprehensive error handling framework
- Retry mechanisms with exponential backoff
- Circuit breakers for external services (Stripe, OpenAI, Redis)
- Health monitoring and observability

**3. UX Track (Frontend-focused) → 95/100**
- Universal loading state system
- Error recovery patterns
- Empty state library
- Full WCAG 2.1 AA compliance (keyboard navigation, screen readers, contrast)

### Infrastructure-First Philosophy

Rather than fixing issues one-by-one, we build reusable patterns:

- **Transaction wrapper** → wraps any edge function in atomic DB operations
- **ErrorBoundary library** → 5 specialized boundaries for different contexts
- **LoadingState components** → 8 reusable loading patterns
- **ValidationService** → centralized validation with database-level enforcement

### Success Metrics

**Data Integrity (100/100):**
- 100% of mutations in transactions
- Zero orphaned records
- Complete audit trail coverage

**Stability (95/100):**
- <0.1% error rate
- 99.9% uptime
- All errors recoverable with user actions

**UX (95/100):**
- 100% WCAG 2.1 AA compliance
- <200ms perceived load time
- Zero dead-end states

---

## Track 1: Data Integrity → 100/100

**Goal:** Zero data inconsistency, 100% referential integrity, complete audit trail

### 1.1 Transaction Management Layer

**Current Gap:** Edge functions perform multi-table operations without transaction wrappers. If operation fails mid-way, database is left in inconsistent state.

**Solution: `withTransaction` Wrapper**

Create `backend/supabase/functions/_shared/transaction.ts`:

```typescript
export async function withTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  options?: { isolationLevel?: 'READ COMMITTED' | 'SERIALIZABLE' }
): Promise<T> {
  const client = createAdminClient();

  try {
    await client.rpc('begin_transaction', {
      isolation: options?.isolationLevel || 'READ COMMITTED'
    });

    const result = await operation(client);

    await client.rpc('commit_transaction');
    return result;

  } catch (error) {
    await client.rpc('rollback_transaction');
    throw error;
  }
}
```

**Critical Operations to Wrap:**
- Contract creation (contracts + line_items + obligations)
- Vendor merge (25+ table updates)
- Payment processing (invoices + subscriptions + usage)
- Bulk imports (batch + validation + records)

**Impact:** Prevents 100% of partial-write scenarios. Guarantees atomic operations.

### 1.2 Database Constraint Hardening

**Add Missing Constraints:**

1. **Foreign Key Enforcement** - Audit all tables for missing FK constraints
2. **NOT NULL Validation** - Critical fields like `enterprise_id`, `user_id`, `created_at`
3. **Unique Constraints** - Prevent duplicate records (email per enterprise, contract numbers)
4. **Check Constraints** - Business rules (amounts > 0, dates valid, status enums)

**Migration: `143_data_integrity_hardening.sql`**

Will add 50+ constraints across 30 tables based on audit findings.

### 1.3 Audit Trail System

**Every mutation tracked:** Who, What, When, Why

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL,
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Automatic triggers** on all critical tables (contracts, vendors, payments).

---

## Track 2: Stability → 95/100

**Goal:** <0.1% error rate, graceful degradation, self-healing systems

### 2.1 Error Handling Framework

**Current Gap:** Errors crash operations without recovery. Users see generic "Something went wrong" messages.

**Solution: Error Classification & Recovery System**

Create `backend/supabase/functions/_shared/errors.ts`:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public recoverable: boolean,
    public retryable: boolean,
    public userMessage: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
  }
}

// Pre-defined error types
export class DatabaseError extends AppError { /* retryable */ }
export class ValidationError extends AppError { /* not retryable */ }
export class ExternalServiceError extends AppError { /* retryable with backoff */ }
export class AuthorizationError extends AppError { /* not retryable */ }
```

**Error Recovery Matrix:**

| Error Type | User Action | System Action | Retry? |
|------------|-------------|---------------|--------|
| Network timeout | "Try again" button | Auto-retry 3x with backoff | Yes |
| Validation failed | Show specific fields | None | No |
| Rate limit hit | "Wait 60s" countdown | Queue request | Yes |
| Service down | "Use offline mode" | Circuit breaker open | No |

### 2.2 Retry Mechanisms

**Exponential Backoff with Jitter:**

```typescript
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 10000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts ||
          (options.shouldRetry && !options.shouldRetry(error))) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      await sleep(delay);
    }
  }
}
```

**Apply to:**
- All external API calls (Stripe, OpenAI, Resend)
- Redis operations
- Database queries with timeouts
- File uploads

### 2.3 Circuit Breaker Pattern

**Prevent cascading failures when services are down:**

```typescript
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime?: number;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

**One circuit breaker per external service:**
- `stripeCircuitBreaker` - Stripe API
- `openaiCircuitBreaker` - OpenAI API
- `redisCircuitBreaker` - Redis cache

**Fallback behaviors:**
- Stripe down → Queue payments, process when recovered
- OpenAI down → Return "AI analysis pending" status
- Redis down → Direct database queries (slower but works)

### 2.4 Health Monitoring

**Create `/health` endpoint exposing all system health:**

```typescript
GET /health
{
  "status": "healthy",
  "database": { "status": "up", "latency": 12 },
  "redis": { "status": "up", "latency": 5 },
  "stripe": { "status": "up", "circuit": "CLOSED" },
  "openai": { "status": "degraded", "circuit": "HALF_OPEN" },
  "disk": { "usage": 45 },
  "memory": { "usage": 62 }
}
```

---

## Track 3: UX → 95/100

**Goal:** WCAG 2.1 AA compliant, zero dead-end states, <200ms perceived load time

### 3.1 Universal Loading State System

**8 Reusable Loading Patterns**

Create `frontend/src/components/loading/`:

1. **SkeletonLoader** - Content placeholders (cards, tables, forms)
2. **SpinnerLoader** - Simple operations (button actions, toggles)
3. **ProgressLoader** - Long operations (file upload, batch processing)
4. **StreamingLoader** - Real-time data (AI responses, notifications)
5. **LazyLoader** - Component code splitting
6. **InfiniteScrollLoader** - Pagination
7. **OptimisticLoader** - Instant UI update, sync in background
8. **SuspenseBoundary** - React Suspense wrapper with fallback

**Usage Pattern:**

```tsx
// Skeleton for initial page load
<SkeletonLoader variant="contract-list" count={5} />

// Progress for file upload
<ProgressLoader
  value={uploadProgress}
  label="Uploading contract.pdf"
  cancelable
  onCancel={handleCancel}
/>

// Optimistic for quick actions
<button onClick={optimisticUpdate}>
  {isPending ? <SpinnerLoader size="sm" /> : 'Approve'}
</button>
```

**Key Principles:**
- Show skeleton within 100ms of user action
- Display progress for operations >3 seconds
- Allow cancellation for operations >10 seconds
- Never show blank screens

### 3.2 Error Recovery Patterns

**5 Error State Components**

Create `frontend/src/components/errors/`:

1. **InlineError** - Form field errors with field highlighting
2. **BannerError** - Page-level warnings with retry actions
3. **ModalError** - Critical failures requiring attention
4. **EmptyStateError** - No data with recovery paths
5. **FallbackError** - Catastrophic failures with reload/support

**Error Recovery Matrix:**

| Scenario | Component | User Action | Auto-Recovery |
|----------|-----------|-------------|---------------|
| Invalid email format | InlineError | Fix and resubmit | No |
| Network timeout | BannerError | Retry button | Auto-retry 3x |
| File upload failed | ModalError | Choose: retry or new file | No |
| No search results | EmptyStateError | Clear filters or new search | No |
| React component crash | FallbackError | Reload page | No |

### 3.3 Empty State Library

**Every list/grid/table has meaningful empty state:**

```tsx
// Contracts page - no contracts
<EmptyState
  illustration={<ContractIllustration />}
  title="No contracts yet"
  description="Upload your first contract to start managing your vendor relationships"
  primaryAction={{ label: "Upload contract", onClick: openUpload }}
  secondaryAction={{ label: "Use template", onClick: openTemplates }}
  learnMoreLink="/docs/contracts"
/>
```

### 3.4 WCAG 2.1 AA Compliance

**Phase 1 Requirements (No keyboard shortcuts):**

**3.4.1 Keyboard Navigation**
- Tab order logical and sequential
- All interactive elements focusable
- Focus indicators visible (2px outline, 3:1 contrast)
- Skip links to main content
- No keyboard traps

**3.4.2 Screen Reader Support**
- Semantic HTML (nav, main, article, section)
- ARIA labels on all icons and buttons
- ARIA live regions for dynamic content
- ARIA expanded/collapsed states
- Form labels and error associations

**3.4.3 Color & Contrast**
- Text contrast 4.5:1 minimum (7:1 for AAA)
- UI component contrast 3:1 minimum
- No color-only information conveyance
- Focus indicators independent of color

**3.4.4 Motion & Animation**
- Respect `prefers-reduced-motion`
- Pauseable animations
- No auto-playing videos
- No flashing content (3 flashes per second rule)

**Implementation:**

```tsx
// Accessible button component
<Button
  aria-label="Upload contract"
  aria-describedby="upload-hint"
  onKeyDown={handleKeyPress}
>
  <UploadIcon aria-hidden="true" />
  Upload
</Button>
<span id="upload-hint" className="sr-only">
  Supported formats: PDF, DOCX. Max size: 50MB
</span>

// Respect motion preferences
const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={{ opacity: 1 }}
  transition={{
    duration: shouldReduceMotion ? 0 : 0.3
  }}
>
```

**Testing Tools:**
- axe DevTools for automated checks
- NVDA/JAWS screen readers for manual testing
- Keyboard-only navigation testing
- Color contrast analyzer

---

## Implementation Plan

**Timeline: 10-12 days (2 weeks with buffer)**

### Phase 1: Foundation & Infrastructure (Days 1-3)

**Day 1: Data Integrity Infrastructure**
- Create transaction wrapper (`withTransaction`)
- Create migration `143_data_integrity_hardening.sql`
- Audit all tables for missing constraints
- Add foreign keys, NOT NULL, unique constraints

**Day 2: Stability Infrastructure**
- Create error classification system (`AppError` classes)
- Create retry mechanism (`withRetry`)
- Create circuit breaker implementation
- Add health monitoring endpoint

**Day 3: UX Infrastructure**
- Create 8 loading state components
- Create 5 error state components
- Create empty state library
- Set up accessibility testing tools (axe DevTools)

**Deliverable:** All reusable patterns ready for application

---

### Phase 2: Data Integrity to 100/100 (Days 4-5)

**Day 4: Transaction Wrappers**
- Wrap all multi-table operations
- Add rollback logic to error handlers
- Test atomic operations

**Day 5: Audit Trail System**
- Create `audit_log` table and triggers
- Add automatic audit triggers to 30 critical tables
- Implement audit viewer in admin dashboard

**Validation:**
- Run orphan record query (should return 0)
- Test interrupted operations (should rollback cleanly)
- Verify all constraints enforced

**Deliverable:** Data Integrity = 100/100

---

### Phase 3: Stability to 95/100 (Days 6-8)

**Day 6: Error Handling**
- Replace generic errors with classified `AppError` types
- Add recovery actions to all error states
- Implement error boundary hierarchy
- Add error tracking (Sentry)

**Day 7: External Service Resilience**
- Add `withRetry` to all external API calls
- Implement circuit breakers for each service
- Add fallback behaviors

**Day 8: Health Monitoring**
- Implement `/health` endpoint
- Add database/Redis/service health checks
- Set up uptime monitoring

**Validation:**
- Simulate service failures (verify circuit breakers)
- Test retry mechanisms (verify exponential backoff)
- Check error recovery (all errors have user actions)

**Deliverable:** Stability = 95/100

---

### Phase 4: UX to 95/100 (Days 9-11)

**Day 9: Loading & Empty States**
- Replace all loading scenarios with appropriate loaders
- Add empty states to all list/grid/table views
- Test perceived performance (<200ms skeleton display)

**Day 10: Error States & Recovery**
- Replace all error displays with recovery patterns
- Add user-friendly error messages
- Test all error scenarios have recovery paths

**Day 11: Accessibility (WCAG 2.1 AA)**
- Keyboard navigation audit (tab order, focus, skip links)
- Screen reader audit (ARIA labels, semantic HTML)
- Color contrast audit (4.5:1 text, 3:1 UI)
- Motion preferences (`prefers-reduced-motion`)

**Validation:**
- Run axe DevTools (0 violations)
- Test with screen reader
- Keyboard-only navigation test
- Color contrast analyzer

**Deliverable:** UX = 95/100

---

### Phase 5: Testing & Skills Creation (Day 12)

**Morning: End-to-End Testing**
- Test all critical user flows
- Verify all three tracks meet targets

**Afternoon: Skill Creation**
- Create `data-integrity-audit` skill
- Create `stability-audit` skill
- Create `ux-accessibility-audit` skill
- Create `production-readiness-assessment` skill

**Deliverable:** All targets met + 4 reusable skills

---

## Dependency Map

```
Day 1-3 (Infrastructure)
    ↓
    ├─→ Day 4-5 (Data Integrity)
    ├─→ Day 6-8 (Stability)
    └─→ Day 9-11 (UX)
            ↓
    Day 12 (Testing & Skills)
```

**Parallel Work Opportunities:**
- Days 4-11 can have some parallelization with multiple team members
- Infrastructure (Days 1-3) must complete first

---

## Risk Mitigation

**Potential Blockers:**

1. **Transaction wrapper breaks existing operations**
   - Mitigation: Test thoroughly in dev, feature flag in production
   - Rollback plan: Revert to non-transactional until fixed

2. **WCAG compliance requires significant markup changes**
   - Mitigation: Start with most-used pages first
   - Progressive enhancement: Ship 80% compliant, finish remaining 20% post-launch

3. **External service circuit breakers too aggressive**
   - Mitigation: Conservative thresholds initially (5 failures before opening)
   - Monitor and tune based on real usage

---

## Post-Launch Enhancements (Phase 2 - Optional)

**Keyboard Shortcuts (Power User Features):**
- Global shortcuts (Cmd+K command palette, Cmd+/)
- Context shortcuts (C to create, U to upload)
- Command palette
- Shortcut legend

**Impact:** Pushes UX from 95/100 → 98-100/100, but not blocking for launch.

---

## Success Criteria

**Go/No-Go Decision:**

✅ **GO** if:
- Data Integrity = 100/100 (all mutations in transactions, zero orphans)
- Stability = 95/100 (<0.1% error rate, all errors recoverable)
- UX = 95/100 (WCAG AA compliant, zero dead-end states)

❌ **NO-GO** if any target not met.

---

## Skills to be Created

1. **`data-integrity-audit`** - Transaction audit, constraint checks, referential integrity
2. **`stability-audit`** - Error handling coverage, retry mechanisms, circuit breaker health
3. **`ux-accessibility-audit`** - WCAG compliance, loading states, keyboard navigation
4. **`production-readiness-assessment`** - Orchestrates all three audits, generates report

Usage: `/data-integrity-audit` or `/production-readiness-assessment`

---

**Design Status:** ✅ Approved
**Next Step:** Set up implementation environment (git worktree, implementation plan)
