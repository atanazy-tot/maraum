# Maraum MVP - PostgreSQL Database Schema

## Overview

This database schema supports the Maraum MVP, a German language learning platform with dual-chat interface (魔/間). The schema is designed for Supabase PostgreSQL with Row-Level Security, optimized for character-by-character streaming conversations, and includes automated cleanup mechanisms.

## Tables

### 1. profiles

User profile table extending Supabase Auth. One profile per authenticated user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User ID from Supabase Auth |
| email | TEXT | NOT NULL | User email address |
| completed_scenario_count | INTEGER | DEFAULT 0, NOT NULL, CHECK (completed_scenario_count >= 0) | Total scenarios completed all-time |
| current_week_completion_count | INTEGER | DEFAULT 0, NOT NULL, CHECK (current_week_completion_count >= 0) | Scenarios completed in current week (max 3) |
| week_reset_date | TIMESTAMPTZ | NOT NULL | UTC timestamp for next weekly limit reset |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last profile update timestamp |

**Notes:**
- `week_reset_date` stored as UTC, converted to local timezone in application layer
- Weekly limit (3 completions) enforced in application code, not database constraint
- Profile automatically created via trigger after Supabase Auth registration

---

### 2. scenarios

Static scenario configuration table. Contains 3 pre-defined scenarios for MVP.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Scenario identifier (1, 2, 3) |
| title | TEXT | NOT NULL | Scenario title (e.g., "Marketplace Encounter") |
| emoji | TEXT | NOT NULL | Emoji identifier (🛒, 🎉, 🥙) |
| initial_message_main | TEXT | NOT NULL | Pre-written opening message for 魔 (main chat, German) |
| initial_message_helper | TEXT | NOT NULL | Pre-written opening message for 間 (helper chat, English) |
| is_active | BOOLEAN | DEFAULT true, NOT NULL | Flag to enable/disable scenario |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Scenario creation timestamp |

**Notes:**
- Scenarios are static configuration data, not user-generated
- Prompt templates stored as .MD files in project repository, not in database
- Minimal metadata only; vocabulary themes and difficulty excluded (handled via prompt engineering)
- `id` values: 1 = 🛒 Marketplace, 2 = 🎉 Party, 3 = 🥙 Kebab

---

### 3. sessions

Represents a single conversation attempt through a scenario. Users can have only one active (incomplete) session at a time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Session identifier |
| user_id | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | Owner of session |
| scenario_id | INTEGER | NOT NULL, REFERENCES scenarios(id) ON DELETE RESTRICT | Scenario being played |
| is_completed | BOOLEAN | DEFAULT false, NOT NULL | Completion status |
| started_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Session start timestamp |
| last_activity_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last message or interaction timestamp |
| completed_at | TIMESTAMPTZ | NULL | Completion timestamp (NULL if incomplete) |
| message_count_main | INTEGER | DEFAULT 0, NOT NULL | Count of messages in main (魔) chat |
| message_count_helper | INTEGER | DEFAULT 0, NOT NULL | Count of messages in helper (間) chat |
| duration_seconds | INTEGER | NULL | Total session duration (calculated once on completion) |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Record creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last record update timestamp |

**Notes:**
- Single active session enforced via unique partial index (see Indexes section)
- `message_count_main` and `message_count_helper` updated automatically via trigger
- `duration_seconds` calculated on completion: `EXTRACT(EPOCH FROM (completed_at - started_at))`
- Expected message counts: 15-30 messages in main chat, variable in helper chat
- Sessions auto-expire after 7 days of inactivity via cleanup function

---

### 4. messages

Normalized storage for all conversation messages from both chats. Immutable once created.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Message identifier |
| session_id | UUID | NOT NULL, REFERENCES sessions(id) ON DELETE CASCADE | Parent session |
| role | TEXT | NOT NULL, CHECK (role IN ('user', 'scenario', 'helper')) | Message sender role |
| chat_type | TEXT | NOT NULL, CHECK (chat_type IN ('main', 'helper')) | Which chat interface |
| content | TEXT | NOT NULL | Message content |
| timestamp | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Message send/receive timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Database record creation timestamp |

**Notes:**
- `role` values: 'user' (human), 'scenario' (魔 NPC), 'helper' (間 AI companion)
- `chat_type` values: 'main' (left panel, German), 'helper' (right panel, English)
- Approximately 100 messages expected per completed session
- Messages never updated after creation (immutable)
- Supports incremental saves during streaming

---

### 5. logs

Operational event tracking for debugging, monitoring, and analytics. Auto-expires after 30 days.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Log entry identifier |
| level | TEXT | NOT NULL, CHECK (level IN ('error', 'warn', 'info', 'debug')) | Severity level |
| event_type | TEXT | NOT NULL, CHECK (event_type IN (...)) | Event category (see below) |
| user_id | UUID | NULL, REFERENCES profiles(id) ON DELETE SET NULL | Associated user (nullable for system events) |
| session_id | UUID | NULL, REFERENCES sessions(id) ON DELETE SET NULL | Associated session (nullable) |
| metadata | JSONB | NULL | Additional event-specific data |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Event timestamp |

**Event Types:**
- **API Events:** `api_call_started`, `api_call_completed`, `api_call_failed`, `api_call_timeout`, `api_retry_attempted`
- **Authentication Events:** `user_registered`, `user_login_success`, `user_login_failed`, `user_logout`, `session_expired`, `account_deleted`
- **Scenario Events:** `scenario_started`, `scenario_completed`, `scenario_abandoned`
- **Session Events:** `session_created`, `session_restored`, `session_expiration_cleanup`
- **Rate Limiting:** `rate_limit_checked`, `rate_limit_exceeded`, `weekly_limit_reset`
- **System Events:** `database_error`, `cleanup_job_executed`, `unknown_error`

**Notes:**
- Message content NEVER logged (privacy constraint)
- Only metadata logged (timestamps, counts, IDs)
- Automatic 30-day retention via cleanup function
- Foreign keys use `ON DELETE SET NULL` to preserve logs after user/session deletion

---

## Relationships

```
auth.users (Supabase Auth)
    ↓ 1:1 (CASCADE)
profiles
    ↓ 1:N (CASCADE)
sessions ← N:1 (RESTRICT) scenarios
    ↓ 1:N (CASCADE)
messages

profiles → N:1 (SET NULL) logs
sessions → N:1 (SET NULL) logs
```

### Relationship Details

1. **auth.users → profiles** (1:1)
   - One Supabase Auth user has one profile
   - `ON DELETE CASCADE`: Deleting auth user removes profile

2. **profiles → sessions** (1:N)
   - One user can have multiple sessions (historical)
   - But only ONE incomplete session at a time (enforced by unique partial index)
   - `ON DELETE CASCADE`: Deleting profile removes all user's sessions

3. **scenarios → sessions** (1:N)
   - One scenario can be played by many users
   - `ON DELETE RESTRICT`: Cannot delete scenario if active sessions exist

4. **sessions → messages** (1:N)
   - One session contains many messages (~100 per session)
   - `ON DELETE CASCADE`: Deleting session removes all its messages

5. **profiles → logs** (1:N)
   - Optional relationship (logs can exist without user)
   - `ON DELETE SET NULL`: User deletion preserves logs for analytics

6. **sessions → logs** (1:N)
   - Optional relationship (logs can exist without session)
   - `ON DELETE SET NULL`: Session deletion preserves logs for analytics

---

## Indexes

### Critical Indexes

```sql
-- profiles table
CREATE INDEX idx_profiles_email ON profiles(email);

-- sessions table
CREATE UNIQUE INDEX idx_sessions_active_per_user 
  ON sessions(user_id) 
  WHERE is_completed = false;
  -- Enforces single active session per user

CREATE INDEX idx_sessions_history 
  ON sessions(user_id, completed_at DESC) 
  WHERE is_completed = true;
  -- Optimizes history retrieval (completed scenarios only)

CREATE INDEX idx_sessions_user_lookup 
  ON sessions(user_id, is_completed);
  -- General session lookups

CREATE INDEX idx_sessions_expiration_cleanup 
  ON sessions(last_activity_at) 
  WHERE is_completed = false;
  -- Optimizes 7-day expiration cleanup query

-- messages table
CREATE INDEX idx_messages_session_chronological 
  ON messages(session_id, timestamp);
  -- Optimizes message retrieval in order

CREATE INDEX idx_messages_chat_type 
  ON messages(session_id, chat_type, timestamp);
  -- Optimizes retrieval for specific chat panel

-- logs table
CREATE INDEX idx_logs_level 
  ON logs(level);
  -- Filter by severity

CREATE INDEX idx_logs_event_type 
  ON logs(event_type);
  -- Filter by event category

CREATE INDEX idx_logs_created_at 
  ON logs(created_at DESC);
  -- Cleanup and time-based queries

CREATE INDEX idx_logs_level_created 
  ON logs(level, created_at DESC);
  -- Combined severity and time queries

CREATE INDEX idx_logs_user 
  ON logs(user_id) 
  WHERE user_id IS NOT NULL;
  -- User-specific log retrieval
```

### Index Rationale

- **Unique partial index** on sessions enforces business rule (single active session) at database level
- **Compound indexes** optimize common query patterns (user history, message chronology)
- **Partial indexes** reduce index size by excluding irrelevant rows
- **Descending indexes** on timestamps support ORDER BY DESC queries efficiently

---

## Row-Level Security (RLS) Policies

Enable RLS on all application tables:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
```

### profiles Policies

```sql
-- Users can view only their own profile
CREATE POLICY profiles_select_own 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY profiles_update_own 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own profile (via trigger after auth.users creation)
CREATE POLICY profiles_insert_own 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY profiles_delete_own 
  ON profiles FOR DELETE 
  USING (auth.uid() = id);
```

### scenarios Policies

```sql
-- All authenticated users can view scenarios (read-only public data)
CREATE POLICY scenarios_select_all 
  ON scenarios FOR SELECT 
  TO authenticated 
  USING (true);

-- No INSERT/UPDATE/DELETE for regular users (admin-only, handled outside RLS)
```

### sessions Policies

```sql
-- Users can view only their own sessions
CREATE POLICY sessions_select_own 
  ON sessions FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create sessions for themselves only
CREATE POLICY sessions_insert_own 
  ON sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own sessions
CREATE POLICY sessions_update_own 
  ON sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete only their own sessions
CREATE POLICY sessions_delete_own 
  ON sessions FOR DELETE 
  USING (auth.uid() = user_id);
```

### messages Policies

```sql
-- Users can view messages from their own sessions only
CREATE POLICY messages_select_own 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can insert messages into their own sessions only
CREATE POLICY messages_insert_own 
  ON messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE (messages are immutable)
```

### logs Policies

```sql
-- Logs are system-only; no user access via RLS
-- (Access via application layer with service role key for debugging)
-- Optionally, allow users to view their own logs for transparency:

CREATE POLICY logs_select_own 
  ON logs FOR SELECT 
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for users (system-only)
```

---

## Database Triggers

### 1. Auto-update updated_at timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to sessions
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Auto-increment message counts

```sql
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment appropriate counter based on chat_type
    IF NEW.chat_type = 'main' THEN
        UPDATE sessions 
        SET message_count_main = message_count_main + 1,
            last_activity_at = NOW()
        WHERE id = NEW.session_id;
    ELSIF NEW.chat_type = 'helper' THEN
        UPDATE sessions 
        SET message_count_helper = message_count_helper + 1,
            last_activity_at = NOW()
        WHERE id = NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_session_message_count 
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_message_count();
```

### 3. Calculate session duration on completion

```sql
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate duration when session is marked complete
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_duration_on_completion 
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();
```

### 4. Auto-create profile after auth user registration

```sql
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, week_reset_date)
    VALUES (
        NEW.id,
        NEW.email,
        NOW() + INTERVAL '7 days'  -- Set initial reset date 7 days from now
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();
```

---

## Database Functions

### 1. Delete expired sessions (7-day inactivity)

```sql
CREATE OR REPLACE FUNCTION delete_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions
    WHERE is_completed = false
      AND last_activity_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup execution
    INSERT INTO logs (level, event_type, metadata)
    VALUES (
        'info',
        'session_expiration_cleanup',
        jsonb_build_object('deleted_sessions', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:** Call via scheduled job (pg_cron, GitHub Actions, or application cron)

```sql
SELECT delete_expired_sessions();
```

### 2. Delete old logs (30-day retention)

```sql
CREATE OR REPLACE FUNCTION delete_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup execution (will itself be cleaned up in 30 days)
    INSERT INTO logs (level, event_type, metadata)
    VALUES (
        'info',
        'cleanup_job_executed',
        jsonb_build_object('deleted_logs', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:** Call via scheduled job daily

```sql
SELECT delete_old_logs();
```

**Note:** Post-MVP enhancement could retain 'error' level logs longer for analysis:

```sql
DELETE FROM logs
WHERE created_at < NOW() - INTERVAL '30 days'
  AND level != 'error'
OR (level = 'error' AND created_at < NOW() - INTERVAL '90 days');
```

### 3. Reset weekly completion counts (scheduled for Monday 00:00 UTC)

```sql
CREATE OR REPLACE FUNCTION reset_weekly_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    UPDATE profiles
    SET current_week_completion_count = 0,
        week_reset_date = week_reset_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE week_reset_date <= NOW();
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    -- Log weekly reset
    INSERT INTO logs (level, event_type, metadata)
    VALUES (
        'info',
        'weekly_limit_reset',
        jsonb_build_object('reset_users', reset_count)
    );
    
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:** Call via scheduled job at Monday 00:00 UTC

```sql
SELECT reset_weekly_limits();
```

**Alternative Approach:** Check and reset per-user on scenario start (application layer), avoiding scheduled job requirement.

---

## Data Seeding

### Initial Scenarios (Migration File: 002_seed_scenarios.sql)

```sql
INSERT INTO scenarios (id, title, emoji, initial_message_main, initial_message_helper, is_active) VALUES
(
    1,
    'Marketplace Encounter',
    '🛒',
    'Du stehst auf einem belebten Wochenmarkt in Berlin. Ein Verkäufer an einem Gemüsestand lächelt dich an. "Guten Tag! Suchst du etwas Bestimmtes?"',
    'Ah, you''re attempting German. How ambitious. I suppose I could help you stumble through this conversation. Ask me if you need vocabulary, or just wing it. Your funeral.'
),
(
    2,
    'High School Party',
    '🎉',
    'Du bist auf einer Party in einer Berliner WG. Laute Musik, viele Leute. Jemand kommt auf dich zu mit zwei Bechern. "Hey! Willst du auch was trinken? Oder spielst du lieber Flunkyball?"',
    'A party. How delightfully anxiety-inducing. Let me know if you need help with drinking vocabulary or flirting phrases. Though honestly, you''ll probably need both.'
),
(
    3,
    'Late Night Kebab',
    '🥙',
    'Es ist 2 Uhr morgens. Du stehst in einer Döner-Bude in Kreuzberg. Der Mann hinter der Theke sieht müde aus. "Was darf es sein? Mit scharf?"',
    'The classic Berlin experience: drunk kebab diplomacy. I''ll help you navigate the menu, though I can''t promise you''ll remember this conversation tomorrow.'
);
```

**Note:** These initial messages are placeholders. Final German text should be reviewed by native speaker for natural conversation flow and B1-B2 appropriate vocabulary.

---

## Constraints Summary

### Check Constraints

- `profiles.completed_scenario_count >= 0`
- `profiles.current_week_completion_count >= 0`
- `messages.role IN ('user', 'scenario', 'helper')`
- `messages.chat_type IN ('main', 'helper')`
- `logs.level IN ('error', 'warn', 'info', 'debug')`
- `logs.event_type IN (...)` (see logs table definition for full enum)

### Foreign Key Constraints

| Child Table | Column | References | On Delete | Rationale |
|-------------|--------|------------|-----------|-----------|
| profiles | id | auth.users(id) | CASCADE | User deletion removes profile |
| sessions | user_id | profiles(id) | CASCADE | Profile deletion removes sessions |
| sessions | scenario_id | scenarios(id) | RESTRICT | Prevent scenario deletion with active sessions |
| messages | session_id | sessions(id) | CASCADE | Session deletion removes messages |
| logs | user_id | profiles(id) | SET NULL | Preserve logs after user deletion |
| logs | session_id | sessions(id) | SET NULL | Preserve logs after session deletion |

### Unique Constraints

- `profiles.id` (PRIMARY KEY)
- `scenarios.id` (PRIMARY KEY)
- `sessions.id` (PRIMARY KEY)
- `messages.id` (PRIMARY KEY)
- `logs.id` (PRIMARY KEY)
- `sessions(user_id) WHERE is_completed = false` (partial unique index - enforces single active session)

### Not Null Constraints

All columns marked `NOT NULL` in table definitions above. Key nullable columns:
- `sessions.completed_at` (NULL until session complete)
- `sessions.duration_seconds` (NULL until session complete)
- `logs.user_id` (NULL for system events)
- `logs.session_id` (NULL for non-session events)
- `logs.metadata` (NULL if no additional data)

---

## Design Decisions

### 1. Normalized Message Storage

**Decision:** Separate `messages` table instead of JSONB column in `sessions`.

**Rationale:**
- ~100 messages per session makes JSONB unwieldy
- Character-by-character streaming requires incremental saves
- Avoid rebuilding large JSON documents on each message
- Enables efficient message filtering and analytics
- Better query performance for chronological retrieval

### 2. Dual Message Counters

**Decision:** Separate `message_count_main` and `message_count_helper` columns.

**Rationale:**
- Main chat message count used for scenario conclusion logic (soft cap 20-25, hard cap 30)
- Helper chat count tracked separately (doesn't affect scenario length)
- Updated automatically via trigger
- Avoids expensive COUNT(*) queries

### 3. Single Active Session Enforcement

**Decision:** Unique partial index `(user_id) WHERE is_completed = false`.

**Rationale:**
- Database-level enforcement prevents race conditions
- Application-level validation alone could allow concurrent inserts
- User experience depends on commitment to single scenario
- Historical completed sessions don't violate constraint

### 4. Cascading vs. Restricting Deletes

**Decision:** CASCADE for user data, RESTRICT for static scenarios.

**Rationale:**
- User deletion must remove all personal data (GDPR compliance)
- Scenario deletion prevented if any sessions reference it (data integrity)
- Logs preserved with SET NULL to maintain analytics after user/session deletion

### 5. UTC Timestamp Storage

**Decision:** Store all timestamps in UTC, convert in application layer.

**Rationale:**
- Database-agnostic approach
- Avoids timezone conversion bugs
- Supports international users (future)
- `week_reset_date` displayed in user's local timezone via frontend

### 6. Duration Calculation Strategy

**Decision:** Calculate `duration_seconds` once on completion, not on-the-fly.

**Rationale:**
- Avoids repeated calculations in queries
- Duration is immutable after completion
- Trigger ensures automatic calculation
- Integer storage more efficient than interval type

### 7. Minimal Scenario Metadata

**Decision:** Store only title, emoji, initial messages in database.

**Rationale:**
- Prompt templates managed in version control (.MD files)
- Vocabulary themes and difficulty handled via prompt engineering
- Database contains only runtime-necessary data
- Simplifies schema, improves flexibility

### 8. Structured Logging System

**Decision:** Dedicated `logs` table with severity levels and event taxonomy.

**Rationale:**
- Enables granular filtering (by level, event_type, user, session)
- Supports debugging without full application logging infrastructure
- Privacy-compliant (no message content)
- 30-day auto-expiration manages storage
- JSONB metadata allows flexible event-specific data

### 9. Immutable Messages

**Decision:** No UPDATE/DELETE policies on messages table.

**Rationale:**
- Conversation history is append-only
- Prevents accidental data loss
- Simplifies application logic
- Audit trail preservation

### 10. Trigger-based Automation

**Decision:** Use triggers for updated_at, message counts, duration calculation.

**Rationale:**
- Ensures consistency (application can't forget to update)
- Reduces application code complexity
- Atomic operations prevent race conditions
- Database-level guarantees

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-09  
**Schema Status:** Ready for Implementation  
**Next Steps:** Create migration files and begin Astro application integration

