# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pactwise - A full-stack enterprise-grade contract and vendor management platform with Next.js frontend and Supabase backend. Features AI-powered analysis, real-time collaboration, premium UI components, and comprehensive security for multi-tenant SaaS operations.

## Essential Commands

### CODE REQUIREMENTS

1. There will be no type errors.
2. Prevent the use of "any". Only use it when it is not be able to be defined at all due to complexity of the payload.

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

5. **Real-time Updates**
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
   - Clerk integration for authentication
   - Role-based access control (RBAC)
   - CSP headers and security monitoring
   - Secure API communication with backend

### Core Business Entities

- **Enterprises**: Multi-tenant isolation unit
- **Users**: Clerk auth integration, role-based permissions
- **Contracts**: Lifecycle management (draft → active → expired)
- **Vendors**: Performance tracking and compliance
- **Budgets**: Financial allocation and tracking
- **Agent Tasks**: Async AI processing queue

### Environment Configuration

#### Backend Environment Variables (see `backend/.env.example`):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (for AI features)
- `STRIPE_SECRET_KEY` (for payments)
- `REDIS_URL` (for caching/rate limiting)
- `RESEND_API_KEY` (for emails)

#### Frontend Environment Variables (see `frontend/.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
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

#### Backend Testing

- Unit tests for utility functions
- Integration tests for edge functions
- Use test helpers from `tests/setup.ts`
- Clean up test data after each test
- Mock external services (OpenAI, Stripe) in tests

#### Frontend Testing

- Jest with React Testing Library for component tests
- Unit tests for hooks and utility functions
- Integration tests for complete user workflows
- E2E tests with Playwright for critical paths
- Performance testing with bundle size monitoring
- Accessibility testing with jest-axe
- Visual regression testing for UI components

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

- **Clerk**: Authentication and user management
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

# Pactwise Design System & Aesthetic Guide

## Core Design Philosophy

**Minimalist, Professional, Enterprise-Grade**

The landing page aesthetic follows a strict minimalist approach with geometric precision, emphasizing clarity, whitespace, and purposeful animations. The design communicates enterprise reliability through restraint rather than embellishment.

## Color Palette

### Primary Colors

- **Gray-900** (#111827): Primary text, borders, CTAs
- **Gray-800** (#1F2937): Hover states for dark elements
- **Gray-700** (#374151): Secondary text
- **Gray-600** (#4B5563): Body text, descriptions
- **Gray-500** (#6B7280): Tertiary text, metadata
- **Gray-400** (#9CA3AF): Disabled states, subtle dividers
- **Gray-300** (#D1D5DB): Borders, dividers
- **Gray-200** (#E5E7EB): Subtle borders, secondary dividers
- **Gray-100** (#F3F4F6): Hover backgrounds
- **Gray-50** (#F9FAFB): Background, sections
- **White** (#FFFFFF): Cards, primary backgrounds

### Accent Colors (Used Sparingly)

- **Green-600** (#059669): Success states, checkmarks
- **Green-800** (#065F46): Success text
- **Green-100** (#D1FAE5): Success backgrounds
- **Red-600** (#DC2626): Error states only
- **Black** (#000000): Logo accents only

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
