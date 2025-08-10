# Pactwise - Enterprise Contract Management System

Pactwise is a full-stack enterprise-grade contract and vendor management platform. It features AI-powered analysis, real-time collaboration, premium UI components, and comprehensive security for multi-tenant SaaS operations. This project is built with a Next.js frontend and a Supabase backend.

## Features

- **AI-Powered Analysis:** Leverage AI for contract analysis and insights.
- **Real-time Collaboration:** Work together on contracts in real-time.
- **Vendor Management:** Track vendor performance and compliance.
- **Budget Tracking:** Manage financial allocations and track spending.
- **Secure Multi-tenancy:** Isolate data for each enterprise with row-level security.
- **Role-Based Access Control:** Manage user permissions with a 5-level role hierarchy.
- **Premium UI Components:** A modern and polished user interface built with shadcn/ui and custom components.
- **Extensible Agent System:** A local agent system for various tasks like document processing, financial analysis, and more.

## AI Agent System

The platform includes a comprehensive local agent system with the following features:

*   **Local Agents:** A suite of specialized agents for various tasks:
    *   **SecretaryAgent:** Document processing and extraction.
    *   **ManagerAgent:** Workflow orchestration.
    *   **FinancialAgent:** Financial analysis.
    *   **LegalAgent:** Contract analysis and compliance.
    *   **AnalyticsAgent:** Data analysis and reporting.
    *   **VendorAgent:** Vendor management.
    *   **NotificationsAgent:** Alert management.
*   **Advanced Memory System:**
    *   **Short-term and long-term memory:** For contextual understanding and learning.
    *   **Memory decay and importance scoring:** To surface the most relevant information.
    *   **Vector embeddings:** For semantic search across memories.
*   **Donna AI (Global Learning):**
    *   Learns from anonymized patterns across all enterprises to provide industry-specific insights and best practices.
    *   Utilizes Q-learning for continuous improvement.
*   **Enterprise Isolation:** Each enterprise has its own isolated agent instances and memory, ensuring data privacy and security.
*   **Asynchronous Task Processing:** A robust task queue with priority-based processing and automatic retries.

## Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, shadcn/ui, Radix UI
- **State Management:** Zustand, React Hook Form
- **Authentication:** Supabase Auth
- **Payments:** Stripe
- **Testing:** Jest, React Testing Library, Playwright
- **Monitoring:** Sentry

### Backend

- **Platform:** Supabase
- **Language:** TypeScript
- **Database:** PostgreSQL
- **API:** Edge Functions
- **AI:** OpenAI GPT-4
- **Testing:** Vitest

## Architecture Overview

Pactwise follows a robust and scalable architecture:

- **Database-First Business Logic:** Complex operations are implemented as PostgreSQL functions, with Edge Functions acting as thin controllers.
- **Multi-Tenant Security:** Every query is filtered by `enterprise_id` to ensure data isolation.
- **AI Integration:** An agent system with a task queue for asynchronous AI processing.
- **Real-time Updates:** Supabase Realtime for live data synchronization.

For a more detailed architecture overview, please refer to the `GEMINI.md` file.

## Development Overview

### Backend

- Use database functions for complex business logic.
- Validate inputs with Zod schemas.
- Apply enterprise filtering in all queries.

### Frontend

- Follow Next.js 15 App Router patterns.
- Use TypeScript with strict type checking.
- Implement responsive design with Tailwind CSS.

For more detailed development guidelines, please refer to the `GEMINI.md` file.

## Testing

### Backend

From the `backend` directory:
```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration
```

### Frontend

From the `frontend` directory:
```bash
# Run all tests (backend + frontend)
npm test

# Run frontend tests only
npm run test:frontend
```

## License

This project is proprietary software.
