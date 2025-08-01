# GEMINI.md

This file provides guidance to Gemini Code when working with code in this repository.

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
8. Use path aliases (@/* for src/) for clean imports

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