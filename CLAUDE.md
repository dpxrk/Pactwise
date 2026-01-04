# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pactwise - A full-stack enterprise-grade contract and vendor management platform with Next.js frontend and Supabase backend. Features AI-powered analysis, real-time collaboration, premium UI components, and comprehensive security for multi-tenant SaaS operations.

## The Pactwise Story & Essence

### Core Narrative
**"Intelligent Systems That Transform Contracts"** - Pactwise empowers legal and procurement professionals to evolve from reviewers to strategists, from firefighters to architects of business success.

### The Transformation Journey
1. **From**: Manual contract review, compliance anxiety, reactive vendor management
2. **To**: Strategic legal operations, proactive risk prevention, intelligent vendor partnerships
3. **How**: AI agents that amplify human expertise, not replace it - handling repetitive work so professionals can focus on high-value strategic decisions

### Our Unique Value Proposition
- **Not just AI-powered**: Local AI agents with memory systems that learn your specific business context
- **Not just automation**: Intelligent augmentation that preserves human judgment while eliminating tedious work
- **Not just efficiency**: Transformation from cost center to strategic business advantage

### Design Philosophy
**Technical Precision. Information Density. Professional Authority.**
- Bloomberg Terminal meets Linear - dense, focused, powerful
- Maximum information density without cognitive overload
- Monospace typography for data-heavy interfaces
- Sharp edges and surgical whitespace
- Every pixel serves a functional purpose
- Technical aesthetic that communicates expertise

## Code Requirements

These rules are **non-negotiable** for all code in this repository:

1. **No type errors** - TypeScript strict mode is enabled
2. **No `any` types** - Only use when payload complexity makes typing impractical
3. **Enterprise filtering required** - Every database query MUST include `.eq('enterprise_id', ...)`
4. **Soft deletes** - Always filter with `.is('deleted_at', null)` in queries
5. **Consistent responses** - Use `createSuccessResponse`/`createErrorResponse` helpers
6. **Input validation** - All user input must be validated with Zod schemas
7. **Error handling** - Never expose internal database errors to clients

## Essential Commands

### Backend Development (from /backend)

```bash
npm run start          # Start Supabase locally (API: 54321, DB: 54322, Studio: 54323)
npm run stop           # Stop Supabase
npm run reset          # Reset the database
```

### Frontend Development (from /frontend)

```bash
npm run dev            # Start Next.js development server
npm run dev:clean      # Clean .next cache and start dev server
npm run dev:turbo      # Start dev server with Turbo mode
npm run build          # Build production application
npm run start          # Start production server
npm run lint           # Lint frontend code
```

### Database

```bash
npm run migrate        # Run database migrations
npm run migrate:new    # Create a new migration
npm run seed           # Seed development data
npm run types:generate # Generate TypeScript types from database schema
```

### Edge Functions

```bash
npm run functions:serve  # Serve edge functions locally
npm run functions:deploy # Deploy edge functions
```

### Quality & Testing (Backend - from /backend)

```bash
npm test               # Run tests with Vitest
npm run test:integration # Run integration tests
npm run lint           # Lint TypeScript files
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run typecheck      # Type check without emitting
```

### Frontend Testing (from /frontend)

```bash
npm test               # Run all tests (backend + frontend)
npm run test:frontend  # Run frontend tests only
npm run test:backend   # Run backend tests only
npm run test:coverage  # Run tests with coverage
npm run test:watch     # Run tests in watch mode
npm run test:ci        # Run tests for CI (both backend and frontend with coverage)
```

### Performance & Optimization (Frontend)

```bash
npm run bundle:analyze # Analyze bundle size
npm run bundle:monitor # Monitor bundle size changes
npm run metrics:baseline # Collect performance baseline metrics
npm run test:optimizations # Test performance optimizations
```

### Running a Single Test

```bash
npm test path/to/test.test.ts  # Run specific test file
```

## Database Migration Policy

### Migration Naming Convention

- Format: `NNN_description_of_change.sql` where NNN is a 3-digit number with leading zeros
- Example: `042_add_contract_templates.sql`

### Creating New Migrations

1. Check `supabase/migrations/MIGRATION_INDEX.md` for the next available number
2. Create migration: `supabase migration new your_migration_name`
3. Update the MIGRATION_INDEX.md file with your new migration

### Migration Rules

- **NO DUPLICATE NUMBERS**: Always verify the next available number
- **Atomic Changes**: Each migration should represent one logical change
- **Test Before Deploy**: Run `supabase db reset` to test full migration sequence
- **No Manual Edits**: Never manually rename migration files after creation

## Architecture Overview

### Project Structure

```
pactwise-fork/
├── backend/                    # Supabase backend
│   ├── supabase/
│   │   ├── migrations/         # Database schema migrations (001-042+ files)
│   │   ├── functions/          # Edge Functions organized by domain
│   │   │   ├── _shared/        # Shared utilities (config, cors, supabase, validation)
│   │   │   ├── contracts/      # Contract management endpoints
│   │   │   ├── vendors/        # Vendor management endpoints
│   │   │   ├── ai-analysis/    # AI processing endpoints
│   │   │   ├── local-agents/   # Local AI agent system
│   │   │   ├── stripe-checkout/    # Stripe checkout session creation
│   │   │   ├── stripe-subscription/# Subscription management (get/cancel/resume)
│   │   │   ├── stripe-billing-portal/# Customer billing portal
│   │   │   ├── stripe-invoices/    # Invoice history
│   │   │   ├── stripe-webhook/     # Stripe webhook handler
│   │   │   └── ...            # Other domain functions
│   │   ├── functions-utils/    # Shared utilities (cache, data-loader, rate-limiter)
│   │   ├── types/             # TypeScript type definitions
│   │   └── tests/             # Test files with setup.ts for test utilities
│   └── package.json           # Backend dependencies and scripts
├── frontend/                   # Next.js frontend application
│   ├── src/
│   │   ├── app/               # Next.js 13+ App Router pages
│   │   │   ├── dashboard/     # Main dashboard pages
│   │   │   ├── auth/          # Authentication pages
│   │   │   ├── onboarding/    # User onboarding flow
│   │   │   └── _components/   # Page-specific components
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui base components
│   │   │   ├── premium/       # Premium UI components (animations, effects)
│   │   │   ├── ai/            # AI chat and analysis components
│   │   │   ├── performance/   # Performance optimization components
│   │   │   └── ...           # Domain-specific components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility functions and configurations
│   │   ├── stores/            # Zustand state management
│   │   ├── types/             # TypeScript type definitions
│   │   └── middleware/        # Next.js middleware
│   ├── public/                # Static assets
│   │   ├── workers/           # Web Workers for performance
│   │   └── fonts/             # Custom fonts
│   ├── __tests__/             # Test files
│   ├── scripts/               # Build and deployment scripts
│   ├── k8s/                   # Kubernetes deployment configs
│   ├── grafana/               # Monitoring dashboards
│   └── package.json           # Frontend dependencies and scripts
└── README.md                  # Project documentation
```

### Key Architectural Patterns

#### Backend Architecture

1. **Database-First Business Logic**

   - Complex operations implemented as PostgreSQL functions
   - Edge Functions act as thin controllers
   - RLS policies enforce multi-tenancy at database level

2. **Multi-Tenant Security Model**

   - Every query filtered by `enterprise_id`
   - 5-level role hierarchy: viewer → user → manager → admin → owner
   - JWT authentication with Supabase Auth

3. **Edge Function Pattern**

   ```typescript
   // Standard structure:
   1. Extract and validate auth token
   2. Validate request body with Zod
   3. Call database function or query
   4. Return formatted response
   ```

4. **AI Integration**

   - Agent system with task queue (`agent_tasks` table)
   - Multiple agent types: Secretary, Legal, Compliance
   - OpenAI GPT-4 for analysis, embeddings for search

5. **Payment System (Stripe)**

   - Per-user subscription billing model
   - 4 tiers: Starter ($49), Professional ($99), Business ($149), Enterprise (custom)
   - Edge functions for checkout, billing portal, subscription management
   - Webhook handler for subscription lifecycle events
   - 14-day free trial for all paid plans
   - 20% discount for annual billing

6. **Real-time Updates**
   - Supabase Realtime for live data synchronization
   - Database triggers for automated workflows
   - Notification system for user alerts

#### Frontend Architecture

1. **Next.js 15 App Router**

   - Server and client components for optimal performance
   - App Router with nested layouts and loading states
   - TypeScript with strict type checking enabled

2. **Component Architecture**

   - shadcn/ui for base components with Radix UI primitives
   - Premium components with advanced animations (Framer Motion, GSAP)
   - Atomic design principles with reusable UI components
   - Progressive enhancement and performance-first approach

3. **State Management**

   - Zustand for client state management
   - Server state managed through Supabase real-time subscriptions
   - Form state with React Hook Form and Zod validation

4. **Performance Optimizations**

   - Dynamic imports and code splitting
   - Image optimization with Next.js Image component
   - Web Workers for heavy computations
   - Bundle size monitoring and optimization
   - Virtualized lists for large datasets

5. **Styling & Design System**

   - Tailwind CSS with custom design tokens
   - CSS variables for theming
   - Premium animations and micro-interactions
   - Mobile-first responsive design
   - Dark mode support

6. **Authentication & Security**
   - Supabase Auth for authentication
   - OAuth integration (Google, GitHub)
   - Role-based access control (RBAC)
   - CSP headers and security monitoring
   - Secure API communication with backend

### Core Business Entities

- **Enterprises**: Multi-tenant isolation unit
- **Users**: Supabase auth integration, role-based permissions
- **Contracts**: Lifecycle management (draft → active → expired)
- **Vendors**: Performance tracking and compliance
- **Budgets**: Financial allocation and tracking
- **Subscriptions**: Stripe-managed billing with plan limits
- **Agent Tasks**: Async AI processing queue

### Environment Configuration

#### Backend Environment Variables (see `backend/.env.example`):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (for AI features)
- `STRIPE_SECRET_KEY` (for payments)
- `STRIPE_WEBHOOK_SECRET` (for webhook signature verification)
- `STRIPE_PRICE_ID_*` (price IDs for each plan/interval - generated by setup script)
- `REDIS_URL` (for caching/rate limiting)
- `RESEND_API_KEY` (for emails)

#### Frontend Environment Variables (see `frontend/.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SENTRY_DSN` (for error monitoring)
- `NEXT_PUBLIC_APP_URL` (for production deployments)

### Development Workflow

#### Backend Development

1. Always validate inputs with Zod schemas
2. Use database functions for complex business logic
3. Apply enterprise filtering in all queries
4. Handle errors consistently with appropriate HTTP status codes
5. Log important operations for audit trail
6. Use TypeScript strict mode and path aliases (@/, @types/, @functions/, @utils/)

#### Frontend Development

1. Follow Next.js 15 App Router patterns with server/client components
2. Use TypeScript with strict type checking (no `any` types)
3. Implement responsive design with Tailwind CSS
4. Optimize performance with dynamic imports and code splitting
5. Use Zod for form validation and API schema validation
6. Follow atomic design principles for component architecture
7. Implement proper error boundaries and loading states
8. Use path aliases (@/\* for src/) for clean imports

### Testing Guidelines

#### Test File Naming
- Backend unit: `filename.test.ts` (in `/tests` or `/tests/unit/`)
- Backend integration: `filename.integration.test.ts` (in `/supabase/tests/`)
- Frontend component: `ComponentName.test.tsx` (in `/src/__tests__/`)

#### Backend Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnterprise, createTestUser, cleanupTestData } from './setup';

describe('Feature Name', () => {
  let testEnterprise: { id: string };
  let testUser: { id: string; authToken: string };

  beforeEach(async () => {
    testEnterprise = await createTestEnterprise();
    testUser = await createTestUser(testEnterprise.id, 'admin');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should perform expected behavior', async () => {
    const response = await fetch(`${FUNCTION_URL}/endpoint`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ /* payload */ }),
    });
    expect(response.status).toBe(201);
  });
});
```

#### Frontend Test Template
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText(/expected text/)).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const mockCallback = jest.fn();
    render(<Component onAction={mockCallback} />);
    await userEvent.click(screen.getByRole('button'));
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

#### Test Data Helpers
```typescript
// Available in tests/setup.ts
const enterprise = await createTestEnterprise({ domain: 'test.com' });
const user = await createTestUser(enterprise.id, 'admin'); // 'owner' | 'admin' | 'manager' | 'user' | 'viewer'
const contract = await createTestContract(enterprise.id, { title: 'Test' });
const vendor = await createTestVendor(enterprise.id);
```

### Backend Development Patterns

#### Edge Function Template (Recommended Pattern)
```typescript
import { withMiddleware } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createAdminClient } from '../_shared/supabase.ts';

export default withMiddleware(
  async (context) => {
    const { req, user } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { method } = req;

    // Check permissions
    const permissions = await getUserPermissions(supabase, user.profile, 'contracts');

    if (method === 'GET') {
      // ALWAYS filter by enterprise_id and deleted_at
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

#### Common Pitfalls to Avoid
```typescript
// ❌ WRONG: Missing enterprise filter (SECURITY VULNERABILITY)
const { data } = await supabase.from('contracts').select('*');

// ✅ CORRECT: Always filter by enterprise
const { data } = await supabase
  .from('contracts')
  .select('*')
  .eq('enterprise_id', user.enterprise_id)
  .is('deleted_at', null);

// ❌ WRONG: Ignoring error objects
const { data, error } = await supabase.from('contracts').select('*');
// error is never checked!

// ✅ CORRECT: Always check for errors
const { data, error } = await supabase.from('contracts').select('*');
if (error) throw error;

// ❌ WRONG: Exposing database errors
if (error) return new Response(JSON.stringify(error), { status: 500 });

// ✅ CORRECT: Generic error message
if (error) return createErrorResponseSync('Failed to fetch contracts', 500, req);

// ❌ WRONG: No pagination limit (DoS risk)
const { limit } = params; // User could send limit=1000000

// ✅ CORRECT: Enforce maximum limit
const limit = Math.min(params.limit || 20, 100);
```

### Frontend Development Patterns

#### Import Order Convention
```typescript
// 1. React imports
'use client';
import React, { useState, useEffect, useCallback } from 'react';

// 2. External libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// 3. UI components
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// 4. Custom hooks
import { useAuth } from '@/contexts/AuthContext';

// 5. Utilities and types
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/database.types';
import { createClient } from '@/utils/supabase/client';
```

#### State Management Decision Tree
| Data Type | Solution | Example |
|-----------|----------|---------|
| User preferences | Zustand with persist | Theme, notification settings |
| Server data | useSupabaseQuery hook | Contracts, vendors list |
| Form state | React Hook Form + Zod | Sign-in form, create contract |
| UI state | Local useState | Modal open, active tab |

#### Component Pattern with Variants (CVA)
```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-purple-900 text-white hover:bg-purple-800',
        outline: 'border-2 border-purple-900 hover:bg-purple-50',
        ghost: 'hover:bg-purple-50 text-ghost-700',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string;
  children: React.ReactNode;
}

export function Button({ variant, size, className, children }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))}>
      {children}
    </button>
  );
}
```

### Local Agent System

The project includes a comprehensive local agent system with the following features:

1. **Local Agents** (no LLM dependencies):

   - SecretaryAgent: Document processing and extraction
   - ManagerAgent: Workflow orchestration
   - FinancialAgent: Financial analysis
   - LegalAgent: Contract analysis and compliance
   - AnalyticsAgent: Data analysis and reporting
   - VendorAgent: Vendor management
   - NotificationsAgent: Alert management

2. **Memory System**:

   - Short-term memory (24-hour user-specific storage)
   - Long-term memory (persistent storage with consolidation)
   - Memory decay and importance scoring
   - Vector embeddings for semantic search

3. **Enterprise Isolation**:

   - Each enterprise has isolated agent instances
   - Memory segregation by enterprise and user
   - Configurable agent settings per enterprise

4. **Donna AI** (Global Learning):

   - Learns from anonymized patterns across enterprises
   - Q-learning for continuous improvement
   - Best practice extraction and recommendations
   - Industry-specific insights
   - Complete data anonymization to prevent cross-enterprise data leaks

5. **Task Processing Engine**:
   - Asynchronous task queue
   - Priority-based processing
   - Automatic retries with exponential backoff
   - Real-time status updates

Key files:

- `backend/supabase/functions/local-agents/`: Agent implementations
- `backend/supabase/functions/local-agents/utils/memory.ts`: Memory management
- `backend/supabase/functions/local-agents/donna/`: Donna AI system
- `backend/supabase/functions/agent-processor/`: Task processing edge function
- `backend/supabase/migrations/*_memory_functions.sql`: Memory system SQL functions
- `backend/supabase/migrations/*_donna_system_tables.sql`: Donna AI tables

### Payment & Subscription System

The platform uses Stripe for subscription billing with a per-user pricing model:

1. **Pricing Tiers**:
   | Tier | Monthly | Annual (20% off) | Features |
   |------|---------|------------------|----------|
   | Starter | $49/user | $39/user | 100 contracts, 10 users, 50 vendors |
   | Professional | $99/user | $79/user | 500 contracts, 25 users, unlimited vendors, AI analysis |
   | Business | $149/user | $119/user | Unlimited contracts, 100 users, custom workflows |
   | Enterprise | Custom | Custom | SSO, audit logs, SLA, on-premise option |

2. **Edge Functions**:
   - `stripe-checkout`: Creates Stripe checkout sessions for new subscriptions
   - `stripe-subscription`: GET subscription data, POST cancel/resume
   - `stripe-billing-portal`: Opens Stripe customer portal for self-service
   - `stripe-invoices`: Retrieves paginated invoice history with stats
   - `stripe-webhook`: Handles all Stripe events (subscription lifecycle, invoices)

3. **Database Tables**:
   - `subscription_plans`: Plan definitions with Stripe price IDs and feature limits
   - `subscriptions`: Active subscriptions linked to enterprises
   - `stripe_customers`: Stripe customer ID mapping to enterprises
   - `invoices`: Invoice records synced from Stripe webhooks
   - `usage_records`: Usage tracking for plan limit enforcement

4. **Frontend Components**:
   - `CheckoutButton`: Initiates checkout for plan selection
   - `SubscriptionManager`: Displays current plan, usage, and management options
   - `PricingPremium`: Homepage pricing display with 4 tiers
   - Billing settings page with invoice history

5. **Key Implementation Details**:
   - 14-day free trial on all paid plans
   - Cancel at period end (maintains access until renewal date)
   - Resume canceled subscriptions before period ends
   - Webhook signature verification for security
   - Multi-tenant isolation via `enterprise_id` in metadata

Key files:
- `backend/supabase/functions/stripe-*/`: Stripe edge functions
- `backend/supabase/migrations/009_payment_tables.sql`: Core payment schema
- `backend/supabase/migrations/131_seed_subscription_plans.sql`: Plan seeding
- `backend/scripts/setup-stripe-products.ts`: Programmatic Stripe product creation
- `frontend/src/components/stripe/`: React components for billing UI

### Frontend Technology Stack

#### Core Framework & Build Tools

- **Next.js 15**: React framework with App Router
- **TypeScript 5**: Strict type checking enabled
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **PostCSS**: CSS preprocessing

#### UI Components & Design

- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Headless, accessible UI components
- **Framer Motion**: Advanced animations and transitions
- **GSAP**: High-performance animations
- **Lucide React**: Icon library
- **Three.js**: 3D graphics and visualizations

#### State Management & Data

- **Zustand**: Lightweight state management
- **React Hook Form**: Form state management
- **Zod**: Schema validation for forms and API
- **SWR/React Query**: Server state management (via Supabase)

#### Authentication & Payments

- **Supabase Auth**: Authentication and user management
- **Stripe**: Payment processing
- **@stripe/stripe-js**: Stripe JavaScript SDK

#### Performance & Monitoring

- **Sentry**: Error monitoring and performance tracking
- **Web Vitals**: Performance metrics
- **Bundle Analyzer**: Bundle size optimization
- **Web Workers**: Heavy computation offloading

#### Development & Testing

- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **Playwright**: End-to-end testing
- **ESLint**: Code linting
- **Prettier**: Code formatting

#### Utilities

- **date-fns**: Date manipulation
- **clsx**: Conditional className utility
- **DOMPurify**: HTML sanitization
- **React Window**: Virtualization for large lists

# Brand Color Scheme - Purple/Pink Elegance

## Core Color Palette

### Primary Brand Colors
- **Dark Purple** (#291528) - Primary brand color for buttons, headers, important UI elements
- **Mountbatten Pink** (#9e829c) - Secondary accent for hover states, highlights, and interactive elements
- **Ghost White** (#f0eff4) - Main application background
- **Black Olive** (#3a3e3b) - Secondary dark for body text and borders

### Extended Palette with Shades
```javascript
{
  'purple': {
    50: '#faf5f9',
    100: '#f5ebf3',
    200: '#ead6e7',
    300: '#dab5d5',
    400: '#c388bb',
    500: '#9e829c',  // Mountbatten Pink - Secondary accent
    600: '#7d5c7b',
    700: '#644862',
    800: '#533e52',
    900: '#291528',  // Dark Purple - Primary brand
    950: '#1a0d18',
  },
  'ghost': {
    50: '#ffffff',   // Pure white for cards
    100: '#f0eff4',  // Ghost white - Main background
    200: '#e1e0e9',
    300: '#d2d1de',
    400: '#a9a8b5',
    500: '#80808c',
    600: '#5a5a66',
    700: '#3a3e3b',  // Black Olive - Body text
    800: '#2a2a2a',
    900: '#1a1a1a',
    950: '#0a0a0a',
  }
}
```

### Semantic Colors (Keep for clarity)
- **Success**: #059669 (green) - Success states, completed actions
- **Warning**: #d97706 (amber) - Warning states, pending actions
- **Error**: #dc2626 (red) - Error states, failed actions
- **Info**: #9e829c (mountbatten pink) - Informational highlights

## Usage Guidelines

### Backgrounds
- **Primary Background**: `ghost-100` (#f0eff4) - Main application background (all pages)
- **Card Background**: `ghost-50` (#ffffff) - Cards and elevated surfaces
- **Dark Sections**: `purple-900` (#291528) - Headers, hero sections, emphasis areas
- **Hover Backgrounds**: `ghost-200` (#e1e0e9) - Subtle hover states

### Typography
- **Primary Headings**: `purple-900` (#291528) - Page titles, card titles
- **Body Text**: `ghost-700` (#3a3e3b) - Regular content, paragraphs
- **Secondary Text**: `ghost-500` (#80808c) - Descriptions, metadata, labels
- **Light Text on Dark**: `ghost-50` (#ffffff) - Text on purple-900 backgrounds

### Interactive Elements
- **Primary Button**:
  - Background: `purple-900` (#291528)
  - Text: `ghost-50` (white)
  - Hover: `purple-800` (#533e52)

- **Secondary Button**:
  - Background: transparent
  - Border: `purple-500` (#9e829c)
  - Text: `purple-900` (#291528)
  - Hover: `purple-50` (#faf5f9) background

- **Ghost Button**:
  - Background: transparent
  - Text: `ghost-700` (#3a3e3b)
  - Hover: `ghost-100` (#f0eff4) background, `purple-900` text

- **Hover States**: Use `purple-500` (#9e829c) for highlights and accents
- **Focus States**: `purple-500` (#9e829c) ring with 2px width
- **Links**: `purple-900` (#291528) default, `purple-500` (#9e829c) hover

### Badge Colors
- **Active/Primary**: `purple-900` (#291528) background, white text
- **Pending/Secondary**: `purple-500` (#9e829c) background, white text
- **Success**: Green-100 background, green-800 text (semantic)
- **Warning**: Amber-100 background, amber-800 text (semantic)
- **Error**: Red-100 background, red-800 text (semantic)

### Chart & Graph Colors
All charts and data visualizations use the purple/pink palette exclusively:

**Light Mode Chart Palette:**
1. **chart-1**: `purple-900` (#291528) - Primary data series (dark purple)
2. **chart-2**: `purple-500` (#9e829c) - Secondary data series (mountbatten pink)
3. **chart-3**: `purple-300` (#dab5d5) - Tertiary data series (light purple)
4. **chart-4**: `purple-600` (#7d5c7b) - Quaternary data series (medium purple)
5. **chart-5**: `purple-700` (#644862) - Quinary data series (purple variant)

**Dark Mode Chart Palette:**
1. **chart-1**: `purple-500` (#9e829c) - Primary data series (mountbatten pink)
2. **chart-2**: `purple-300` (#dab5d5) - Secondary data series (light purple)
3. **chart-3**: `purple-600` (#7d5c7b) - Tertiary data series (medium purple)
4. **chart-4**: `purple-400` (#c388bb) - Quaternary data series (light pink)
5. **chart-5**: `purple-600` (#7d5c7b) - Quinary data series (purple variant)

**Usage Guidelines:**
- Use chart-1 and chart-2 for primary comparisons (highest contrast)
- Reserve semantic colors (green, amber, red) for status indicators only
- Maintain WCAG AA compliance - ensure sufficient contrast with backgrounds
- Use opacity variations (50%, 75%, 100%) for stacked/area charts
- Grid lines: `ghost-300` (#d2d1de) at 30% opacity

### Borders & Dividers
- **Default Border**: `ghost-300` (#d2d1de) - 1px solid
- **Emphasized Border**: `purple-500` (#9e829c) - For hover states
- **Dividers**: `ghost-200` (#e1e0e9) - Subtle separators

### Shadows & Effects
- **Card Shadow**: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
- **Elevated Shadow**: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
- **No Glass Effects**: Removed for consistency and readability
- **Gradients**: Minimal use, only for marketing pages
  - Hero gradient: `purple-900` → `purple-800` → `purple-700`

### Key Design Principles
1. **Sophisticated Elegance**: Purple/pink conveys professionalism with warmth
2. **High Contrast**: WCAG AA compliance (4.5:1 minimum contrast ratio)
3. **Consistent Hierarchy**: Use color shades systematically (900 → 100)
4. **Single Source of Truth**: Purple/pink palette only - no earth tones, no teal/cyan
5. **Clear States**: Distinct hover, focus, and active states using purple-500 accents

# Pactwise Design System & Aesthetic Guide

## Core Design Philosophy

**Bloomberg Terminal × Linear: Technical Precision with Purple/Pink Identity**

The Pactwise aesthetic combines dense information architecture with the purple/pink brand identity. Inspired by Bloomberg Terminal and Linear, the design prioritizes maximum data density, monospace typography for technical content, and sharp geometric precision - all while maintaining the distinctive purple (#291528) and pink (#9e829c) color scheme.

**Key Principles:**
- **Information Density**: Maximum data per screen without cognitive overload
- **Technical Authority**: Monospace fonts for data, metrics, IDs, timestamps
- **Sharp Precision**: No rounded corners, surgical whitespace, grid-based layouts
- **Purple/Pink Identity**: Brand colors applied to interactive elements, status indicators, and accents
- **Instant Feedback**: Minimal animation, immediate state changes for tool-like feel
- **Functional First**: Every pixel serves a purpose, no decoration

## Demo Reference
See `/demo/revamp` for a comprehensive showcase of all design patterns, components, and interactions.

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
  "Helvetica Neue", Arial, sans-serif;
```

### Font Weights

- **200 (Light)**: Logo variations
- **300 (Light)**: Logo variations
- **400 (Regular)**: Body text, descriptions
- **600 (Semibold)**: Subheadings, important text
- **700 (Bold)**: Headlines, CTAs

### Font Sizes

- **6xl** (60px): Main hero headlines
- **5xl** (48px): Section headlines
- **4xl** (36px): Subsection headlines
- **2xl** (24px): Card titles
- **xl** (20px): Large body text
- **lg** (18px): Emphasized body text
- **base** (16px): Standard body text
- **sm** (14px): Secondary text, descriptions
- **xs** (12px): Metadata, labels

### Letter Spacing

- Headlines: `-0.03em` (tight)
- Body text: Default
- Uppercase labels: `0.05em` (slightly expanded)

## Spacing & Layout

### Container

- Max-width: `container mx-auto`
- Padding: `px-6` (24px on mobile/desktop)

### Section Spacing

- Vertical padding: `py-20` (80px)
- Between elements: `mb-20` (80px) for major sections
- Card spacing: `gap-8` (32px)

### Grid System

- Primary: 1, 2, or 3 columns
- Breakpoints:
  - Mobile: Single column
  - `md:` (768px+): 2-3 columns
  - `lg:` (1024px+): 3-4 columns

## Component Patterns

### Cards

```jsx
<Card className="relative bg-white border border-gray-300 p-8 h-full">
```

- White background
- Gray-300 border (1px)
- Hover: `border-gray-900` transition
- Padding: `p-8` (32px) standard, `p-6` (24px) compact
- Always `h-full` for equal heights

### Buttons

#### Primary Button

```jsx
<Button className="bg-gray-900 hover:bg-gray-800 text-white">
```

- Background: gray-900
- Hover: gray-800
- No rounded corners (`rounded-none` when specified)
- Padding: `px-8 py-4` for large, `px-6 py-3` for normal

#### Secondary Button

```jsx
<Button variant="outline" className="border-gray-900 text-gray-900 hover:bg-gray-100">
```

- Border: gray-900 (1-2px)
- Text: gray-900
- Hover: gray-100 background

#### Ghost Button

```jsx
<Button variant="ghost" className="text-gray-600 hover:text-gray-900">
```

### Badges

```jsx
<Badge className="bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
```

- Minimal styling
- Used for section labels and status indicators

## Visual Elements

### Borders & Lines

- Primary borders: 1px solid gray-300
- Active/hover borders: 1px solid gray-900
- Emphasized borders: 2px solid gray-900
- Dividers: 1px solid gray-200

### Geometric Patterns

- Grid background: 40x40px squares with 0.5px lines at 5% opacity
- Decorative lines: 1px solid black at various opacities
- Square/rectangular emphasis over rounded shapes

### Icons

- Size: `w-4 h-4` (16px) for inline, `w-6 h-6` (24px) for feature icons
- Color: Inherit from text color, typically gray-600 or gray-900
- Library: Lucide React icons exclusively

## Animation & Interaction

### Motion Principles

- **Subtle and purposeful**: Animations should enhance, not distract
- **Duration**: 200-500ms for most transitions
- **Easing**: Default ease or linear for continuous animations

### Common Animations

```jsx
// Fade in on scroll
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}

// Hover scale
whileHover={{ scale: 1.02 }}

// Stagger children
transition={{ delay: index * 0.1 }}
```

### Hover States

- Border color changes: gray-300 → gray-900
- Background fills: transparent → gray-100
- Text color darkening: gray-600 → gray-900
- Subtle scale: 1.00 → 1.02
- Underline animations for links

## Key Visual Characteristics

### 1. **Extreme Minimalism**

- No gradients (except specific AI agent cards)
- No shadows or drop-shadows
- No rounded corners on primary elements
- Flat design with emphasis on borders

### 2. **Geometric Precision**

- Square and rectangular shapes
- Right angles preferred
- Grid-based layouts
- Mathematical spacing (multiples of 4px/8px)

### 3. **Monochromatic Focus**

- 95% grayscale palette
- Color used only for:
  - Success states (green)
  - Error states (red)
  - Critical CTAs (black/gray-900)

### 4. **Typography-First**

- Large, bold headlines
- Clear hierarchy
- Plenty of whitespace
- No decorative fonts

### 5. **Motion Restraint**

- Subtle parallax effects
- Gentle fade-ins
- No bouncy or playful animations
- Professional, measured transitions

## Implementation Guidelines

### Do's

- ✅ Use consistent spacing multiples (4, 8, 16, 32, 64)
- ✅ Maintain high contrast (gray-900 on white)
- ✅ Keep animations under 500ms
- ✅ Use system fonts for optimal performance
- ✅ Emphasize content over decoration
- ✅ Use borders to create separation
- ✅ Apply hover states consistently

### Don'ts

- ❌ Add gradients without specific purpose
- ❌ Use shadows for depth
- ❌ Round corners unnecessarily
- ❌ Add colors outside the palette
- ❌ Create busy or complex layouts
- ❌ Use decorative elements without function
- ❌ Implement playful or bouncy animations

## Responsive Behavior

### Mobile First

- Stack elements vertically on mobile
- Maintain 24px horizontal padding
- Reduce font sizes by 10-20% on mobile
- Simplify grid layouts to single column

### Desktop Enhancements

- Multi-column layouts
- Larger typography
- More generous spacing
- Parallax and advanced animations

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- Focus states: 2px solid gray-900 outline
- Interactive elements: minimum 44x44px touch target
- Semantic HTML structure
- ARIA labels where needed

## Special Components

### Logo Treatment

```jsx
<span style={{ fontWeight: 400 }}>P</span>
<span style={{ fontWeight: 300 }}>act</span>
<span style={{ fontWeight: 200 }}>wise</span>
```

Variable font weights create subtle distinction

### Status Indicators

- Active: 1.5px solid circle/square in gray-900
- Inactive: 1px solid circle/square in gray-400
- Processing: Rotating border animation

### Progress Indicators

- Thin horizontal lines (1px)
- Fill from left to right
- Gray-900 color
- No percentage text unless critical

## Summary

The Pactwise design system prioritizes **clarity**, **professionalism**, and **restraint**. Every element serves a purpose, with no superfluous decoration. The aesthetic communicates enterprise-grade reliability through precise geometry, generous whitespace, and a strictly limited color palette. This creates a sophisticated, trustworthy appearance that appeals to business decision-makers while maintaining excellent usability and performance.
