# Conversation Summary: Maraum MVP Database Planning

## Decisions

1. **Profiles Table Structure**: Create a separate `profiles` table with foreign key to `auth.users(id)` following Supabase best practices
2. **Messages Storage**: Create a separate `messages` table instead of storing messages in JSONB (session contains ~100 messages combining helper + main chat)
3. **Timezone Handling**: Store `week_reset_date` as UTC timestamp in profiles table
4. **Session Cleanup**: Use database function `delete_expired_sessions()` with scheduled cleanup (7-day expiration for incomplete sessions)
5. **Indexing Strategy**: Implement recommended indexes on sessions table (unique partial index for active sessions, indexes for history and lookups)
6. **Row-Level Security**: Enable RLS on sessions and profiles tables with policies based on `auth.uid() = user_id`
7. **Scenario Management**: Store only minimal scenario metadata in database; prompt templates stored as .MD files at project level
8. **Operational Logging**: Create separate `logs` table with 30-day automatic retention policy, including severity levels (error, warn, info, debug) and detailed event types for granular filtering across API, authentication, scenario, session, rate limiting, and system events
9. **Message Counts**: Store `message_count_main` and `message_count_helper` as separate integer columns, updated incrementally via database trigger
10. **Foreign Keys**: Implement cascading behaviors - CASCADE on user deletion, RESTRICT on scenario deletion
11. **Message Count Updates**: Use database trigger to increment counts on each message INSERT
12. **Conversation Storage**: Remove `conversation_json` column from sessions table entirely - use normalized messages table as single source of truth
13. **Scenarios Table**: Keep minimal - only id, title, emoji, initial messages, and is_active flag. NO difficulty_level, NO vocabulary_themes, NO prompt_template_paths (use environment variables for prompt configuration)
14. **Audit Columns**: Add `created_at` to all tables, `updated_at` to mutable tables (profiles, sessions) with trigger
15. **Intervention System**: Excluded from MVP scope - no irritation tracking, intervention counts, or intervention flags
16. **Duration Tracking**: Calculate `duration_seconds` once when session marked complete using `EXTRACT(EPOCH FROM (completed_at - started_at))`
17. **Data Seeding**: Use SQL migration file (e.g., `002_seed_scenarios.sql`) for inserting initial 3 scenarios
18. **Weekly Limits**: Implement limit logic (3 completions per week) in application code, not database constraints

## Matched Recommendations

1. **Normalized Message Storage**: Separate `messages` table provides better performance for ~100 messages per session, enables incremental saves, simplifies streaming SSE implementation, and facilitates future analytics

2. **Database Schema Structure**:
   ```sql
   profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT,
     completed_scenario_count INTEGER DEFAULT 0,
     current_week_completion_count INTEGER DEFAULT 0 CHECK (current_week_completion_count >= 0),
     week_reset_date TIMESTAMPTZ NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   )
   
   scenarios (
     id INTEGER PRIMARY KEY,
     title TEXT NOT NULL,
     emoji TEXT NOT NULL,
     initial_message_main TEXT NOT NULL,
     initial_message_helper TEXT NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT NOW()
   )
   
   sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     scenario_id INTEGER REFERENCES scenarios(id) ON DELETE RESTRICT,
     is_completed BOOLEAN DEFAULT false,
     started_at TIMESTAMPTZ DEFAULT NOW(),
     last_activity_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ,
     message_count_main INTEGER DEFAULT 0,
     message_count_helper INTEGER DEFAULT 0,
     duration_seconds INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   )
   
   messages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('user', 'scenario', 'helper')),
     chat_type TEXT NOT NULL CHECK (chat_type IN ('main', 'helper')),
     content TEXT NOT NULL,
     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     created_at TIMESTAMPTZ DEFAULT NOW()
   )
   
   logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
     event_type TEXT NOT NULL CHECK (event_type IN (
       -- API Events
       'api_call_started',
       'api_call_completed',
       'api_call_failed',
       'api_call_timeout',
       'api_retry_attempted',
       -- Authentication Events
       'user_registered',
       'user_login_success',
       'user_login_failed',
       'user_logout',
       'session_expired',
       'account_deleted',
       -- Scenario Events
       'scenario_started',
       'scenario_completed',
       'scenario_abandoned',
       -- Session Events
       'session_created',
       'session_restored',
       'session_expiration_cleanup',
       -- Rate Limiting
       'rate_limit_checked',
       'rate_limit_exceeded',
       'weekly_limit_reset',
       -- System Events
       'database_error',
       'cleanup_job_executed',
       'unknown_error'
     )),
     user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
     session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
     metadata JSONB,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )
   ```

3. **Critical Indexes**:
   - Unique partial index on sessions: `(user_id) WHERE is_completed = false` (enforces single active session)
   - History index: `(user_id, completed_at DESC) WHERE is_completed = true`
   - Messages index: `(session_id, timestamp)`
   - Logs indexes: 
     - `(level)` for filtering by severity
     - `(event_type)` for filtering by specific events
     - `(created_at DESC)` for cleanup and time-based queries
     - `(level, created_at DESC)` for combined severity and time queries

4. **Database Triggers**:
   - Message count increment trigger on messages INSERT
   - Updated_at timestamp trigger on profiles and sessions UPDATE
   - Duration calculation on session completion

5. **Automated Cleanup Functions**:
   - `delete_expired_sessions()`: Remove sessions where `is_completed = false` AND `last_activity_at < NOW() - INTERVAL '7 days'`
   - `delete_old_logs()`: Remove logs where `created_at < NOW() - INTERVAL '30 days'` (can be enhanced post-MVP to retain 'error' level logs longer for analysis)

6. **RLS Policies**: All tables with user_id column restrict SELECT/INSERT/UPDATE/DELETE to `auth.uid() = user_id`. Scenarios table is read-only for all authenticated users.

## Database Planning Summary

### Core Architecture
The database schema follows a clean separation of concerns with Supabase Auth handling authentication and four main application tables: profiles, scenarios, sessions, and messages.

### Key Entities and Relationships

**Profiles (1:N Sessions)**: Each user profile can have multiple sessions, but only one active (incomplete) session at a time, enforced by unique partial index.

**Scenarios (1:N Sessions)**: Three pre-defined scenarios (🛒 Marketplace, 🎉 Party, 🥙 Kebab) that users can start. Scenarios are static configuration data with minimal metadata; prompt engineering handled via .MD files referenced through environment variables.

**Sessions (1:N Messages)**: Represents a single conversation attempt through a scenario. Tracks completion status, timing, and message counts. Single active session rule enforced at database level.

**Messages**: Normalized storage for all conversation messages from both chats (魔 main scenario and 間 helper). Approximately 100 messages per session expected. Messages are immutable once created.

**Logs**: Operational event tracking with automatic 30-day retention for debugging and monitoring. Includes severity levels (error, warn, info, debug) and detailed event types for granular filtering and analytics. Events categorized across API operations, authentication, scenarios, sessions, rate limiting, and system operations.

### Security Implementation

**Row-Level Security**: Comprehensive RLS policies ensure users can only access their own data. Sessions, messages, and profiles filtered by authenticated user ID. Scenarios are read-only public data.

**Data Privacy**: Message content never logged. Only metadata (timestamps, counts, IDs) stored in logs table. User identifiers anonymized in logs.

**Account Deletion**: Cascading deletes ensure complete data removal on account deletion (GDPR compliance) - profiles cascade to sessions, sessions cascade to messages.

### Performance and Scalability

**Indexing Strategy**: Optimized for common access patterns:
- Active session lookup (unique constraint doubles as index)
- History retrieval (compound index on user + completion date)
- Message chronological ordering (session + timestamp)
- Log retention cleanup (created_at descending)

**Incremental Updates**: Message counts updated via trigger on each INSERT rather than batch calculations, supporting real-time soft/hard cap logic for scenario conclusions (15-25 messages expected, 30 message hard cap).

**Query Optimization**: Normalized message table over JSONB chosen explicitly for 100-message scale, supporting character-by-character streaming saves without rebuilding large JSON documents.

### Data Integrity

**Constraints**: 
- Foreign keys with appropriate cascading (CASCADE for user data, RESTRICT for static scenarios)
- Check constraints on enums (role, chat_type, event_type)
- NOT NULL constraints on critical fields
- Non-negative check on completion counts

**Audit Trail**: Created_at on all tables, updated_at on mutable tables with automatic trigger maintenance.

**Completion Logic**: Duration calculated once on completion. Message counts incremented via trigger. Completion flag triggers cascade of updates (completion timestamp, duration calculation, user count increments).

**Logging Strategy**: Comprehensive operational logging with four severity levels:
- **error**: System failures, API errors, database errors requiring immediate attention
- **warn**: Recoverable issues like API retries, rate limit checks
- **info**: Normal operations like user logins, scenario completions, session restorations
- **debug**: Detailed diagnostics for development and troubleshooting

Events are categorized across six domains: API operations, authentication flows, scenario lifecycle, session management, rate limiting enforcement, and system maintenance. Each event type is self-documenting for efficient debugging and analytics generation.

### MVP Scope Considerations

**Excluded from Schema**:
- Intervention system fields (current_irritation, intervention_count, was_intervention)
- Difficulty levels and vocabulary themes (moved to prompt engineering)
- Progress tracking and analytics tables (out of MVP scope)
- Social features (out of MVP scope)

**Deferred to Application Layer**:
- Weekly limit enforcement (3 completions per week)
- Session expiration scheduling (7-day cleanup via cron/GitHub Action)
- Prompt template management (environment variables + .MD files)
- Timezone display conversion (UTC stored, local displayed)

### Implementation Approach

**Migration Strategy**: SQL migration files for schema creation and data seeding. Initial migration creates tables with indexes and constraints. Second migration seeds three scenarios with German/English initial messages.

**Cleanup Automation**: Database functions defined for expired session and old log deletion, callable via scheduled jobs (pg_cron or application-level cron).

**Future Extensibility**: Schema designed to accommodate post-MVP features (intervention system) through simple ALTER TABLE additions without data migration requirements.

## Unresolved Issues

1. **Environment Variable Structure**: Specific structure for storing prompt template paths in environment variables needs definition (e.g., `PROMPT_MARKETPLACE_PATH`, `PROMPT_HELPER_PATH`, etc.)

2. **Week Reset Logic**: Application-level implementation details needed for checking and resetting `week_reset_date` + `current_week_completion_count`. Should this be:
   - Checked on every scenario start attempt?
   - Handled via scheduled background job?
   - Both?

3. **Scenario Seeding Details**: Full German/English text for initial messages in all three scenarios needs to be provided for the `002_seed_scenarios.sql` migration file

4. **Log Cleanup Scheduling**: Decision needed on cleanup execution method:
   - pg_cron extension (requires PostgreSQL instance configuration)
   - GitHub Actions scheduled workflow
   - Application-level cron job
   - All options viable; needs deployment environment consideration

5. **Message Retention on Account Deletion**: Confirm whether completed session messages should be permanently deleted on account deletion or anonymized and retained for product analytics (PRD section 5.12.3 suggests complete deletion for GDPR compliance)

6. **Database Connection Pooling**: Configuration details for Supabase connection pooling to handle concurrent users efficiently (important for self-hosted deployment on DigitalOcean)
