# Pactwise Backend (Supabase)

Enterprise-grade contract and vendor management platform backend built with Supabase, featuring AI-powered analysis, real-time collaboration, and comprehensive security.

## Architecture Overview

```
├── supabase/
│   ├── migrations/      # Database schema migrations
│   ├── functions/       # Edge Functions for business logic
│   ├── types/          # TypeScript type definitions
│   ├── policies/       # Row Level Security policies
│   ├── triggers/       # Database triggers
│   ├── views/          # Database views
│   ├── seeds/          # Development seed data
│   └── functions-utils/ # Shared utilities for Edge Functions
```

## Key Features

- **Multi-tenant Architecture**: Complete enterprise isolation with RLS
- **AI-Powered Analysis**: Multi-agent system for contract intelligence
- **Real-time Collaboration**: Live updates and presence tracking
- **Advanced Security**: RBAC, audit logging, and rate limiting
- **Performance Optimized**: Caching, indexes, and query optimization

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Supabase**
   ```bash
   npm run start
   ```

3. **Run Migrations**
   ```bash
   npm run migrate
   ```

4. **Generate Types**
   ```bash
   npm run types:generate
   ```

5. **Seed Development Data**
   ```bash
   npm run seed
   ```

## Database Schema

The system includes 95+ tables organized into:
- Core business entities (enterprises, users, contracts, vendors)
- AI system tables (agents, insights, memory)
- Real-time collaboration tables
- Payment and billing tables
- System and audit tables

## Security Model

- **Authentication**: Supabase Auth with JWT
- **Authorization**: Role-based (owner, admin, manager, user, viewer)
- **Row Level Security**: Automatic enterprise filtering
- **Audit Logging**: All sensitive operations tracked

## Development

```bash
# Create new migration
npm run migrate:new <migration_name>

# Run tests
npm test

# Deploy functions
npm run functions:deploy
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure required services.

## Performance Considerations

- Compound indexes for common query patterns
- Materialized views for analytics
- Edge function caching with Redis
- Optimistic UI updates with real-time subscriptions