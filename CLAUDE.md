# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Maraum** (魔raum) is a German language learning platform featuring a dual-chat interface where users practice conversational German through immersive scenarios. The platform combines LLM-powered German NPCs (魔 - "the bewitching space") with a sarcastic English-speaking AI helper (間 - "the empty interval") to create engaging, low-stakes practice environments.

**Tech Stack:**
- Astro 5 (SSR mode with Node adapter)
- TypeScript 5
- React 19 (interactive components only)
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth, BaaS)
- Claude Streaming API (claude-4.5-haiku)

## Development Commands

### Running the Application
```bash
npm install              # Install dependencies
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
```

### Supabase Operations
```bash
# Database migrations are in supabase/migrations/
# Initial schema: 20251109120000_create_maraum_schema.sql
# Seed data: 20251109120100_seed_scenarios.sql

# Migration naming: YYYYMMDDHHmmss_description.sql
# All SQL must be lowercase with copious comments
```

## High-Level Architecture

### 1. Dual-Chat Interface (Core UX)

The defining feature is the split-screen dual chat:

**Left Panel (魔 - Main Chat):**
- All German conversation with LLM-powered NPCs
- Users navigate pre-written scenarios (3 total: Marketplace 🛒, Party 🎉, Kebab 🥙)
- Character-by-character streaming responses
- Message counts trigger natural scenario conclusions (15-30 messages)

**Right Panel (間 - Helper Chat):**
- English-language AI companion with sarcastic, philosophical personality
- Provides vocabulary help, grammar tips, conversation suggestions
- Maintains consistent character across all sessions
- 80% helpful sarcasm / 20% existential tangents

### 2. Session Management Philosophy

**Single Active Session Rule:**
- Users cannot scenario-hop; one incomplete session max per user
- Enforced at database level via unique partial index
- Sessions persist for 7 days before auto-expiration
- Automatic restoration on page refresh/browser reopen
- Encourages commitment to completing conversations

**Message Storage:**
- Normalized structure (separate `messages` table, not embedded JSON)
- Supports incremental saves during streaming (~100 messages per session)
- Immutable after creation
- Dual counters track main vs. helper chat separately

### 3. Supabase Integration Pattern

**Authentication:**
- httpOnly cookies for session management (never localStorage)
- Supabase Auth with custom `profiles` table (1:1 relationship)
- Profile auto-created via trigger on auth.users insert

**Database Access:**
- ALWAYS use `context.locals.supabase` in Astro routes
- NEVER import `supabaseClient` directly in API routes
- Use `SupabaseClient` type from `src/db/supabase.client.ts`
- Row-level security policies enforce data isolation

**Middleware:**
- `src/middleware/index.ts` injects Supabase client into context.locals
- All protected routes access database through this pattern

### 4. LLM Streaming Architecture

**System Prompts:**
- Stored as `.md` files in version control (NOT in database)
- Modular structure: base template + scenario-specific components
- Configuration managed via environment variables (timeouts, temps, token limits)

**Streaming Pattern:**
- Anthropic Streaming API with Server-Sent Events (SSE)
- Character-by-character display for "typing" effect
- Incremental saves to database during streaming
- Retry logic: 3 attempts with exponential backoff
- Timeouts: 30s scenario chat, 20s helper chat

**Scenario Completion:**
- LLM outputs special completion flag (parsed by backend)
- Triggered by message count (soft cap 20-25, hard 30) or narrative conclusion
- No manual "finish" button - scenarios complete naturally
- Sets `is_completed = true`, calculates duration, increments user counters

### 5. Rate Limiting & Gamification

**Weekly Limits:**
- 3 completed scenarios per week per user
- Enforced in application logic (not database constraint)
- Resets Monday 00:00 UTC (stored as `week_reset_date` in profiles)
- Only completions count; started but incomplete sessions don't

**Immersive Design Philosophy:**
- NO traditional gamification (points, badges, streaks, leaderboards)
- Engagement comes from narrative investment and helper relationship
- Enigmatic UI rewards discovery over tutorials
- Error messages maintain helper personality voice

## Directory Structure

```
src/
├── layouts/           # Astro layouts
├── pages/             # Astro pages (routing)
│   └── api/           # API endpoints (use POST/GET uppercase)
├── middleware/        # Astro middleware (Supabase injection)
├── db/                # Supabase clients and database types
├── types.ts           # Shared types (Entities, DTOs)
├── components/        # Astro (static) and React (dynamic) components
│   ├── ui/            # Shadcn/ui components
│   └── hooks/         # Custom React hooks
├── lib/               # Services and helpers
│   └── services/      # Business logic extracted from routes
└── assets/            # Static internal assets

supabase/
├── config.toml        # Supabase configuration
└── migrations/        # SQL migration files

.ai/                   # Project planning documents
├── prd-mvp-maraum.md  # Complete product requirements
├── db-plan.md         # Database schema specification
└── tech-stack.md      # Technology decisions
```

## Important Patterns & Rules

### Astro Guidelines

- Use `export const prerender = false` for API routes
- API handlers use uppercase: `export async function POST(context) { ... }`
- Extract business logic into `src/lib/services`, not inline in routes
- Use Zod for input validation in API routes
- Leverage `Astro.cookies` for server-side cookie management
- Use `import.meta.env` for environment variables (typed in `src/env.d.ts`)

### React Guidelines

- Use functional components with hooks (no class components)
- NEVER use `"use client"` or Next.js directives
- Extract logic into custom hooks in `src/components/hooks`
- Use `React.memo()` for expensive components with stable props
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive calculations
- Use `useId()` for accessibility IDs

### Tailwind Patterns

- Use `@layer` directive to organize styles
- Use arbitrary values with square brackets for one-off designs: `w-[123px]`
- Implement dark mode with `dark:` variant
- Use responsive variants: `sm:`, `md:`, `lg:`
- Use state variants: `hover:`, `focus-visible:`, `active:`

### Database & SQL Style

- All SQL lowercase (reserved words, table names, columns)
- Use snake_case for tables and columns
- Plural table names, singular column names
- Always include schema in queries: `public.sessions`
- Add table comments (up to 1024 chars) for documentation
- Foreign key suffix: `user_id` references `users` table
- Always enable RLS and create granular policies per role and operation

### Migration File Naming

Format: `YYYYMMDDHHmmss_short_description.sql`

Example: `20251109120000_create_maraum_schema.sql`

**Migration Headers Must Include:**
- Purpose of migration
- Affected tables/columns
- Special considerations
- Comments explaining each step

### Error Handling

- Handle errors and edge cases at function beginning
- Use early returns to avoid deep nesting
- Place happy path last for readability
- Avoid unnecessary else statements (use if-return pattern)
- Use guard clauses for preconditions
- Implement proper error logging (metadata only, never message content)
- Error messages maintain helper personality voice

### Security Requirements

- httpOnly cookies for authentication (prevent XSS)
- HTTPS enforced (HTTP redirects)
- Row-level security policies on all tables
- Passwords hashed via Supabase Auth
- No credentials in logs
- Conversation content NEVER logged (only metadata)
- SQL injection prevention via parameterized queries

## Environment Variables

Required in `import.meta.env` (typed in `src/env.d.ts`):

```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  // Add new env vars here and in env.d.ts
}
```

## Database Schema Summary

**Core Tables:**
- `profiles` - User data extending Supabase Auth (1:1 with auth.users)
- `scenarios` - Static configuration (3 pre-written scenarios)
- `sessions` - Conversation attempts (single active session per user)
- `messages` - Normalized message storage (~100 per session)
- `logs` - Operational events (30-day retention, privacy-compliant)

**Key Constraints:**
- Unique partial index enforces single active session per user
- Foreign keys CASCADE on user deletion (GDPR compliance)
- Foreign keys RESTRICT on scenario deletion (data integrity)
- Messages immutable (no UPDATE/DELETE policies)

**Automated Triggers:**
- `updated_at` timestamp auto-update
- Message count increment on insert
- Session duration calculation on completion
- Profile creation on auth.users insert

**Scheduled Functions:**
- `delete_expired_sessions()` - Remove sessions inactive 7+ days
- `delete_old_logs()` - Remove logs older than 30 days
- `reset_weekly_limits()` - Reset completion counters Monday 00:00 UTC

## Testing & Validation

When implementing features:

1. **Manual Testing Required:**
   - Test dual-chat streaming with real LLM calls
   - Verify session restoration after browser refresh
   - Test rate limiting boundary conditions (weekly reset timing)
   - Validate RLS policies (users can't access others' data)

2. **Database Migrations:**
   - Test migrations in isolation before applying
   - Verify triggers work correctly
   - Test rollback procedures
   - Ensure RLS policies don't break queries

3. **Streaming Edge Cases:**
   - Network interruption during streaming
   - API timeout handling (30s scenario, 20s helper)
   - Partial response handling
   - Character-by-character display performance

## Development Workflow Tips

1. **When adding API routes:**
   - Extract logic into services (`src/lib/services`)
   - Use Zod validation for input
   - Access Supabase via `context.locals.supabase`
   - Use uppercase handler names (POST, GET)
   - Add `export const prerender = false`

2. **When modifying database schema:**
   - Create timestamped migration file
   - Write comprehensive comments
   - Test triggers and RLS policies
   - Update `src/env.d.ts` if types change
   - Consider cascading delete implications

3. **When implementing new scenarios:**
   - Create `.md` prompt template in version control
   - Add scenario to `scenarios` table via migration
   - Include initial messages for both chats
   - Define completion criteria and example exchanges
   - Test message count triggers conclusion correctly

4. **When debugging:**
   - Check `logs` table for operational events
   - Verify RLS policies not blocking queries
   - Test Supabase client in context.locals available
   - Validate streaming SSE connection stays open
   - Check message counters updating correctly

## Common Pitfalls to Avoid

- ❌ Importing `supabaseClient` directly in API routes
- ❌ Using `"use client"` in React components
- ❌ Storing prompts in database (use .md files)
- ❌ Allowing multiple active sessions per user
- ❌ Logging conversation content (privacy violation)
- ❌ Using localStorage for auth tokens (use httpOnly cookies)
- ❌ Creating uppercase SQL (all lowercase required)
- ❌ Adding traditional gamification (points, badges)
- ❌ Breaking helper personality voice in UI text

## Useful References

- Full PRD: `.ai/prd-mvp-maraum.md`
- Database Schema: `.ai/db-plan.md`
- Tech Stack Decisions: `.ai/tech-stack.md`
- Cursor AI Rules: `.cursor/rules/` (especially `shared.mdc`, `backend.mdc`, `astro.mdc`)
- Supabase Init Guide: `.cursor/rules/api-supabase-astro-init.mdc`
- Migration Guide: `.cursor/rules/db-supabase-migrations.mdc`
- SQL Style Guide: `.cursor/rules/postgres-sql-style-guide.mdc`
