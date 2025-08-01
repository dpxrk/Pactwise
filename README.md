# Pactwise - Enterprise Contract Management System

## Project Structure

This repository is organized into a clean architecture with separation of concerns:

```
pactwise-fork/
├── frontend/          # Frontend application (Next.js)
├── backend/           # Backend services (coming soon - Supabase)
└── README.md         # This file
```

## Frontend

The frontend directory contains the Next.js application with all UI components, pages, and client-side logic. It's currently configured as a placeholder implementation waiting for the Supabase backend integration.

### Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Backend (Coming Soon)

The backend directory will contain the Supabase configuration, database migrations, edge functions, and API logic.

## Migration Status

This codebase has been migrated from Convex to prepare for Supabase integration. All Convex-specific code has been removed and replaced with placeholder implementations.

### What's Been Done:
- ✅ Removed all Convex dependencies
- ✅ Created placeholder API hooks and functions
- ✅ Maintained UI components and pages
- ✅ Set up proper TypeScript types
- ✅ Organized code into frontend directory

### What's Next:
- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Implement authentication with Supabase Auth
- [ ] Create API routes and edge functions
- [ ] Connect frontend to Supabase backend
- [ ] Implement real-time features with Supabase Realtime

## Development

Currently, the frontend runs with mock data and placeholder implementations. Once the Supabase backend is set up, these placeholders will be replaced with actual API calls.

## License

This project is proprietary software.