# CLAUDE.md

Guidance for Claude Code when working with the Pactwise codebase.

## Project Overview

Pactwise is an enterprise-grade contract and vendor management platform with AI-powered analysis. Built with Next.js 15 frontend and Supabase backend, featuring local AI agents, real-time collaboration, and multi-tenant SaaS architecture.

---

## Quick Reference

### Where to Find Things

| I need to... | Look in... |
|--------------|------------|
| Add an edge function | `backend/supabase/functions/<domain>/index.ts` |
| Add a migration | `backend/supabase/migrations/` (check MIGRATION_INDEX.md first) |
| Add a React component | `frontend/src/components/<domain>/` |
| Add a custom hook | `frontend/src/hooks/` |
| Add a dashboard page | `frontend/src/app/dashboard/<section>/page.tsx` |
| Find shared utilities | `backend/supabase/functions/_shared/` |
| Find TypeScript types | `backend/supabase/types/database.ts` |
| Find Stripe integration | `backend/supabase/functions/stripe-*/` |
| Find Donna AI code | `backend/supabase/functions/donna-*/` |
| Find local agents | `backend/supabase/functions/local-agents/agents/` |
| Find UI components | `frontend/src/components/ui/` |
| Find design system | `DESIGN_SYSTEM.md` |

### Common Imports (Edge Functions)

```typescript
import { withMiddleware } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getUserPermissions } from '../_shared/auth.ts';
```

### Common Imports (Frontend)

```typescript
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
```

### Key Commands

```bash
# Backend (from /backend)
npm run start           # Start Supabase (API: 54321, DB: 54322, Studio: 54323)
npm run stop            # Stop Supabase
npm run reset           # Reset database
npm run functions:serve # Serve edge functions locally

# Frontend (from /frontend)
npm run dev             # Start dev server
npm run build           # Production build
npm run lint            # Lint code

# Database
npm run migrate         # Run migrations
npm run types:generate  # Generate TypeScript types
```

---

## Code Requirements (Non-Negotiable)

### Security Rules

```typescript
// ALWAYS filter by enterprise_id (SECURITY CRITICAL)
const { data } = await supabase
  .from('contracts')
  .select('*')
  .eq('enterprise_id', user.enterprise_id)  // Required
  .is('deleted_at', null);                   // Required for soft deletes

// ALWAYS check errors
if (error) throw error;

// NEVER expose database errors
if (error) return createErrorResponseSync('Failed to fetch', 500, req);

// ALWAYS enforce pagination limits
const limit = Math.min(params.limit || 20, 100);
```

### Type Safety

- No `any` types (except complex external payloads)
- TypeScript strict mode enabled
- Validate all input with Zod schemas

### Response Handling

- Use `createSuccessResponse` / `createErrorResponse` helpers
- Never expose internal database errors to clients
- Handle all error cases explicitly

---

## Verification (Non-Negotiable)

### Before Committing

Run from the correct directory. Never claim work is done without passing output.

**Backend changes** (run from `backend/`):
```bash
npm run typecheck        # Ultra-strict TS (exactOptionalPropertyTypes enabled)
npm run lint             # 70+ ESLint rules incl. security + promise handling
npm test                 # Vitest unit tests
```

**Frontend changes** (run from `frontend/`):
```bash
npm run typecheck        # Strict TS (tsc --noEmit)
npm run lint             # Next.js + enforced import ordering
npm run build            # Full production build — catches SSR + bundle issues
```

**SQL migrations**: `npm run reset` from `backend/` to verify the full migration sequence.

If any command fails, fix it before proceeding. Do not defer fixes to a later step.

### Evidence Rule

After running verification, paste the terminal output (or the relevant passing/failing summary). Stating "it compiles" or "tests pass" without evidence is not acceptable. If output is too long, paste the final summary line (e.g., `Tests: 204 passed` or `error TS2345: ...`).

### Known Pitfalls

Check every change against this list — these are recurring mistakes in this codebase:

1. **Missing `enterprise_id` filter** — Every query on a tenant table MUST include `.eq('enterprise_id', ...)`. Omitting this leaks data across tenants.
2. **Missing `.is('deleted_at', null)`** — Soft-deleted rows appear without this. Check the table schema for `deleted_at` columns.
3. **Backend `exactOptionalPropertyTypes`** — `field?: string` means the property may not exist, but when present it must be `string` (not `undefined`). Use `field: string | undefined` when you need to assign `undefined` explicitly.
4. **Monorepo directory** — `npm run typecheck` must run from `backend/` or `frontend/`, never from the repo root. There is no root-level tsconfig.
5. **Unchecked Supabase errors** — Always check `if (error)` before using `data`. The Supabase client returns `{ data: null, error }` on failure, not exceptions.
6. **Frontend import order** — ESLint enforces alphabetized grouped imports. Fix with `npm run lint:fix` from `frontend/`.

---

## Project Architecture

### Monorepo Structure

```
Pactwise/
├── backend/                    # Supabase backend
│   ├── supabase/
│   │   ├── functions/          # 85 edge functions
│   │   │   ├── _shared/        # Shared utilities (34 files)
│   │   │   └── <domain>/       # Domain-specific functions
│   │   ├── migrations/         # 109 SQL migrations
│   │   ├── types/              # TypeScript types
│   │   └── tests/              # Test files
│   ├── ml-services/            # ML service modules
│   └── scripts/                # Deployment scripts
├── frontend/                   # Next.js 15 application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── dashboard/      # Main dashboard (13 sections)
│   │   │   ├── auth/           # Authentication
│   │   │   ├── onboarding/     # User onboarding
│   │   │   └── portal/         # External vendor portal
│   │   ├── components/         # 21 component directories
│   │   ├── hooks/              # 56+ custom hooks
│   │   ├── lib/                # Utilities (64+ files)
│   │   ├── stores/             # Zustand state
│   │   └── contexts/           # React contexts
│   └── public/                 # Static assets
├── admin/                      # Admin dashboard (separate app)
└── shared/                     # Shared types and utilities
```

### Edge Functions (85 total)

| Category | Functions | Description |
|----------|-----------|-------------|
| **Contracts** | contracts, contract-templates, clause-library, clauses, contract-intelligence, contract-obligations, contract-intake, negotiation-playbooks | Contract management and analysis |
| **Vendors** | vendors, vendor-analytics, vendor-communications, vendor-matcher | Vendor management and scoring |
| **AI Agents** | local-agents, agents, agents-legal-*, agents-manager, agents-sourcing, agent-processor | AI processing and automation |
| **Donna AI** | donna-feedback, donna-realtime, donna-terminal | Cross-enterprise learning system |
| **Payments** | stripe-checkout, stripe-subscription, stripe-billing-portal, stripe-invoices, stripe-webhook | Stripe billing integration |
| **Documents** | documents, document-diff, document-classifier, collaborative-edit, pdf-signature, esignature, line-item-extraction | Document processing |
| **Security** | security-monitoring, security-alerts, security-webhooks, native-pki | Security infrastructure |
| **Compliance** | compliance, approvals, approval-matrix, obligation-management, slas, kpis | Compliance and workflows |
| **Core** | auth, auth-signup, users, dashboard, budgets, notifications, realtime, health, search, tags | Platform fundamentals |
| **Trade** | tariff-calculation, hts-suggestion, taxonomy-matcher, market-intelligence | Trade and tariff features |
| **Demo/Test** | demo-*, test-donna-* | Testing and demonstration |

### Frontend Components (21 directories)

| Directory | Purpose |
|-----------|---------|
| `ui/` | shadcn/ui base components |
| `premium/` | Advanced animations (Framer Motion, GSAP) |
| `ai/` | AI chat and analysis |
| `agents/` | Agent UI components |
| `dashboard/` | Dashboard-specific components |
| `stripe/` | Payment components |
| `donna-terminal/` | Donna AI terminal interface |
| `collaborative-editor/` | Real-time editing |
| `charts/` | Data visualization |
| `auth/` | Authentication components |

### Shared Utilities (`backend/supabase/functions/_shared/`)

| File | Purpose |
|------|---------|
| `middleware.ts` | Request middleware with auth |
| `responses.ts` | Standard response helpers |
| `supabase.ts` | Supabase client creation |
| `auth.ts` | Permission checking |
| `validation.ts` | Zod validation helpers |
| `rate-limiting.ts` | Rate limit implementation |
| `cache-*.ts` | Caching utilities |
| `security-*.ts` | Security monitoring |

---

## Development Patterns

### Edge Function Template

```typescript
import { withMiddleware } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getUserPermissions } from '../_shared/auth.ts';

export default withMiddleware(
  async (context) => {
    const { req, user } = context;
    const supabase = createAdminClient();
    const { method } = req;

    // Check permissions
    const permissions = await getUserPermissions(supabase, user.profile, 'contracts');

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', user.enterprise_id)
        .is('deleted_at', null);

      if (error) throw error;
      return createSuccessResponse(data, undefined, 200, req);
    }

    return createErrorResponseSync('Method not allowed', 405, req);
  },
  { requireAuth: true, rateLimit: true }
);
```

### Frontend Import Order

```typescript
// 1. React imports
'use client';
import React, { useState, useEffect } from 'react';

// 2. External libraries
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

// 3. UI components
import { Button } from '@/components/ui/button';

// 4. Custom hooks
import { useAuth } from '@/contexts/AuthContext';

// 5. Utilities and types
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/database.types';
```

### State Management

| Data Type | Solution |
|-----------|----------|
| User preferences | Zustand with persist |
| Server data | useSupabaseQuery hook |
| Form state | React Hook Form + Zod |
| UI state | Local useState |

---

## Key Systems

### Local Agent System

7 specialized agents with memory systems:
- **SecretaryAgent**: Document processing
- **ManagerAgent**: Workflow orchestration
- **FinancialAgent**: Financial analysis
- **LegalAgent**: Contract analysis
- **AnalyticsAgent**: Data analysis
- **VendorAgent**: Vendor management
- **NotificationsAgent**: Alert management

Memory: Short-term (24h) + Long-term (persistent) with vector embeddings.

### Donna AI

Cross-enterprise learning system:
- Learns from anonymized patterns across all enterprises
- Q-learning for continuous improvement
- Best practice extraction
- Complete data anonymization

### Payment System (Stripe)

| Tier | Monthly | Features |
|------|---------|----------|
| Starter | $49/user | 100 contracts, 10 users |
| Professional | $99/user | 500 contracts, AI analysis |
| Business | $149/user | Unlimited, custom workflows |
| Enterprise | Custom | SSO, SLA, on-premise |

14-day free trial. 20% annual discount.

### Multi-Tenant Security

- Every query filtered by `enterprise_id`
- 5-level role hierarchy: viewer → user → manager → admin → owner
- RLS policies enforce isolation at database level
- JWT authentication with Supabase Auth

---

## Testing

### Backend Tests (Vitest)

```bash
npm test                     # Run all tests
npm test path/to/test.ts     # Run specific test
npm run test:integration     # Integration tests
```

### Frontend Tests (Jest)

```bash
npm run test:frontend        # Frontend tests
npm run test:coverage        # With coverage
npm run test:watch           # Watch mode
```

### Test File Naming

- Backend: `filename.test.ts`
- Frontend: `ComponentName.test.tsx`
- Integration: `filename.integration.test.ts`

---

## Database Migrations

- 109 migrations in `backend/supabase/migrations/`
- Format: `NNN_description.sql` (3-digit number)
- Check `MIGRATION_INDEX.md` for next available number
- Run `supabase db reset` to test full sequence

---

## Environment Variables

### Backend (`backend/.env`)

```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_*
REDIS_URL
RESEND_API_KEY
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
SENTRY_DSN
```

---

## Design System

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for complete visual guidelines.

**Brand Colors:**
- Primary: Dark Purple `#291528`
- Accent: Mountbatten Pink `#9e829c`
- Background: Ghost White `#f0eff4`
- Text: Black Olive `#3a3e3b`

**Key Principles:**
- Bloomberg Terminal meets Linear aesthetic
- Maximum information density
- No rounded corners, sharp geometric precision
- Monospace for data, metrics, timestamps

---

## Upgrade Progress

### Agent Upgrade Status (8-Task Playbook)

All 7 agents have completed the full 8-task production upgrade playbook.

| Agent | Task 1 | Task 2 | Task 3 | Task 4 | Task 5 | Task 6 | Task 7 | Task 8 | Status |
|-------|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| Financial | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Complete (reference) |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (76) | ✓ | Complete |
| Vendor | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (204) | ✓ | Complete |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (228) | ✓ | Complete |
| Secretary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (243) | ✓ | Complete |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (178) | ✓ | Complete |
| Legal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (97) | ✓ | Complete |

**Tasks**: 1=JSDoc module, 2=JSDoc methods, 3=Zod schemas, 4=Config system, 5=Error handling, 6=Test fixtures, 7=Test suite, 8=Final verification

### Agent Upgrade File Locations

| Component | Path |
|-----------|------|
| Agent implementations | `backend/supabase/functions/local-agents/agents/*.ts` |
| Zod schemas | `backend/supabase/functions/local-agents/schemas/*.ts` |
| Config systems | `backend/supabase/functions/local-agents/config/*-config.ts` |
| Test fixtures | `backend/tests/fixtures/*-test-data.ts` |
| Comprehensive tests | `backend/tests/*-agent-comprehensive.test.ts` |
