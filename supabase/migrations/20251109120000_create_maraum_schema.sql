-- =====================================================================
-- Migration: Create Maraum MVP Database Schema
-- =====================================================================
-- Description: Creates core tables, indexes, triggers, functions, and
--              Row-Level Security policies for the Maraum German language
--              learning platform with dual-chat interface (魔/間).
--
-- Tables Created:
--   - profiles: User profile extending Supabase Auth
--   - scenarios: Static scenario configuration (3 pre-defined)
--   - sessions: Conversation attempts (one active per user)
--   - messages: Normalized message storage (~100 per session)
--   - logs: Operational event tracking (30-day retention)
--
-- Features:
--   - Automated weekly limit resets
--   - Single active session enforcement via unique partial index
--   - Automatic message count increments via triggers
--   - Character-by-character streaming support
--   - 7-day session expiration cleanup
--   - 30-day log retention cleanup
--
-- Author: atanazy
-- Date: 2025-11-09
-- Version: 1.0
-- =====================================================================

-- =====================================================================
-- TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------
-- Purpose: User profile table extending Supabase Auth
-- Relationship: 1:1 with auth.users
-- Notes: 
--   - Automatically created via trigger after auth.users registration
--   - Tracks weekly scenario completion limits (max 3 per week)
--   - week_reset_date stored in UTC, converted to local timezone in app
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    -- Primary key linked to Supabase Auth
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User identification
    email TEXT NOT NULL,
    
    -- Scenario completion tracking
    completed_scenario_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_scenario_count >= 0),
    current_week_completion_count INTEGER NOT NULL DEFAULT 0 CHECK (current_week_completion_count >= 0),
    week_reset_date TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase Auth with scenario completion tracking';
COMMENT ON COLUMN profiles.id IS 'User ID from Supabase Auth (auth.users.id)';
COMMENT ON COLUMN profiles.completed_scenario_count IS 'Total scenarios completed all-time';
COMMENT ON COLUMN profiles.current_week_completion_count IS 'Scenarios completed in current week (max 3)';
COMMENT ON COLUMN profiles.week_reset_date IS 'UTC timestamp for next weekly limit reset';

-- ---------------------------------------------------------------------
-- Table: scenarios
-- ---------------------------------------------------------------------
-- Purpose: Static scenario configuration (pre-defined conversation scenarios)
-- Relationship: Referenced by sessions table
-- Notes:
--   - Contains 3 MVP scenarios (seeded in separate migration)
--   - Prompt templates stored as .MD files in repository, not in DB
--   - is_active flag allows enabling/disabling scenarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scenarios (
    -- Static identifier (1, 2, 3 for MVP)
    id INTEGER PRIMARY KEY,
    
    -- Scenario metadata
    title TEXT NOT NULL,
    emoji TEXT NOT NULL,
    
    -- Pre-written opening messages for both chat interfaces
    initial_message_main TEXT NOT NULL,    -- 魔 (main chat, German)
    initial_message_helper TEXT NOT NULL,  -- 間 (helper chat, English)
    
    -- Configuration
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scenarios IS 'Static scenario configuration for language learning conversations';
COMMENT ON COLUMN scenarios.id IS 'Scenario identifier (1=🛒 Marketplace, 2=🎉 Party, 3=🥙 Kebab)';
COMMENT ON COLUMN scenarios.initial_message_main IS 'Opening message for 魔 (main chat, German)';
COMMENT ON COLUMN scenarios.initial_message_helper IS 'Opening message for 間 (helper chat, English)';
COMMENT ON COLUMN scenarios.is_active IS 'Flag to enable/disable scenario availability';

-- ---------------------------------------------------------------------
-- Table: sessions
-- ---------------------------------------------------------------------
-- Purpose: Represents a single conversation attempt through a scenario
-- Relationship: Belongs to profiles, references scenarios, has many messages
-- Constraints:
--   - Only ONE active (incomplete) session allowed per user (enforced by unique partial index)
--   - Expected 15-30 messages in main chat, variable in helper chat
--   - Auto-expires after 7 days of inactivity
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
    
    -- Session state
    is_completed BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    
    -- Statistics (updated automatically via triggers)
    message_count_main INTEGER NOT NULL DEFAULT 0,    -- Main chat (魔) message count
    message_count_helper INTEGER NOT NULL DEFAULT 0,  -- Helper chat (間) message count
    duration_seconds INTEGER NULL,                     -- Calculated on completion
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Conversation attempts through scenarios (one active per user)';
COMMENT ON COLUMN sessions.user_id IS 'Owner of the session';
COMMENT ON COLUMN sessions.scenario_id IS 'Scenario being played';
COMMENT ON COLUMN sessions.is_completed IS 'Completion status (false = active/abandoned, true = completed)';
COMMENT ON COLUMN sessions.last_activity_at IS 'Last message or interaction timestamp (for expiration cleanup)';
COMMENT ON COLUMN sessions.message_count_main IS 'Count of messages in main (魔) chat (used for scenario conclusion logic)';
COMMENT ON COLUMN sessions.message_count_helper IS 'Count of messages in helper (間) chat';
COMMENT ON COLUMN sessions.duration_seconds IS 'Total session duration in seconds (calculated on completion)';

-- ---------------------------------------------------------------------
-- Table: messages
-- ---------------------------------------------------------------------
-- Purpose: Normalized storage for all conversation messages from both chats
-- Relationship: Belongs to sessions
-- Constraints:
--   - Immutable once created (no UPDATE/DELETE policies)
--   - Supports incremental saves during character-by-character streaming
--   - ~100 messages expected per completed session
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Message metadata
    role TEXT NOT NULL CHECK (role IN ('user', 'scenario', 'helper')),
    chat_type TEXT NOT NULL CHECK (chat_type IN ('main', 'helper')),
    
    -- Message content
    content TEXT NOT NULL,
    
    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'Normalized storage for all conversation messages (immutable)';
COMMENT ON COLUMN messages.session_id IS 'Parent session';
COMMENT ON COLUMN messages.role IS 'Message sender: user (human), scenario (魔 NPC), helper (間 AI companion)';
COMMENT ON COLUMN messages.chat_type IS 'Chat interface: main (left panel, German), helper (right panel, English)';
COMMENT ON COLUMN messages.content IS 'Message text content';
COMMENT ON COLUMN messages.timestamp IS 'Message send/receive timestamp';

-- ---------------------------------------------------------------------
-- Table: logs
-- ---------------------------------------------------------------------
-- Purpose: Operational event tracking for debugging, monitoring, analytics
-- Retention: Auto-expires after 30 days
-- Privacy: Message content NEVER logged, only metadata
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Log classification
    level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    event_type TEXT NOT NULL CHECK (event_type IN (
        -- API Events
        'api_call_started', 'api_call_completed', 'api_call_failed', 
        'api_call_timeout', 'api_retry_attempted',
        -- Authentication Events
        'user_registered', 'user_login_success', 'user_login_failed',
        'user_logout', 'session_expired', 'account_deleted',
        -- Scenario Events
        'scenario_started', 'scenario_completed', 'scenario_abandoned',
        -- Session Events
        'session_created', 'session_restored', 'session_expiration_cleanup',
        -- Rate Limiting
        'rate_limit_checked', 'rate_limit_exceeded', 'weekly_limit_reset',
        -- System Events
        'database_error', 'cleanup_job_executed', 'unknown_error'
    )),
    
    -- Optional associations (nullable for system events)
    user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    session_id UUID NULL REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Event-specific data (flexible JSON structure)
    metadata JSONB NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE logs IS 'Operational event tracking (30-day retention, privacy-compliant)';
COMMENT ON COLUMN logs.level IS 'Severity level for filtering';
COMMENT ON COLUMN logs.event_type IS 'Event category for classification';
COMMENT ON COLUMN logs.user_id IS 'Associated user (nullable for system events, preserved after user deletion)';
COMMENT ON COLUMN logs.session_id IS 'Associated session (nullable, preserved after session deletion)';
COMMENT ON COLUMN logs.metadata IS 'Additional event-specific data (NO message content)';

-- =====================================================================
-- INDEXES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Indexes: profiles
-- ---------------------------------------------------------------------
CREATE INDEX idx_profiles_email ON profiles(email);

-- ---------------------------------------------------------------------
-- Indexes: sessions
-- ---------------------------------------------------------------------

-- Enforces single active session per user (critical business rule)
CREATE UNIQUE INDEX idx_sessions_active_per_user 
    ON sessions(user_id) 
    WHERE is_completed = false;

COMMENT ON INDEX idx_sessions_active_per_user IS 'Enforces single active session per user (unique partial index)';

-- Optimizes completed scenario history retrieval
CREATE INDEX idx_sessions_history 
    ON sessions(user_id, completed_at DESC) 
    WHERE is_completed = true;

COMMENT ON INDEX idx_sessions_history IS 'Optimizes history retrieval (completed scenarios only)';

-- General session lookups
CREATE INDEX idx_sessions_user_lookup 
    ON sessions(user_id, is_completed);

-- Optimizes 7-day expiration cleanup query
CREATE INDEX idx_sessions_expiration_cleanup 
    ON sessions(last_activity_at) 
    WHERE is_completed = false;

COMMENT ON INDEX idx_sessions_expiration_cleanup IS 'Optimizes 7-day expiration cleanup query';

-- ---------------------------------------------------------------------
-- Indexes: messages
-- ---------------------------------------------------------------------

-- Optimizes message retrieval in chronological order
CREATE INDEX idx_messages_session_chronological 
    ON messages(session_id, timestamp);

COMMENT ON INDEX idx_messages_session_chronological IS 'Optimizes chronological message retrieval';

-- Optimizes retrieval for specific chat panel (main vs helper)
CREATE INDEX idx_messages_chat_type 
    ON messages(session_id, chat_type, timestamp);

COMMENT ON INDEX idx_messages_chat_type IS 'Optimizes retrieval for specific chat interface';

-- ---------------------------------------------------------------------
-- Indexes: logs
-- ---------------------------------------------------------------------

-- Filter by severity level
CREATE INDEX idx_logs_level 
    ON logs(level);

-- Filter by event category
CREATE INDEX idx_logs_event_type 
    ON logs(event_type);

-- Cleanup and time-based queries
CREATE INDEX idx_logs_created_at 
    ON logs(created_at DESC);

-- Combined severity and time queries
CREATE INDEX idx_logs_level_created 
    ON logs(level, created_at DESC);

-- User-specific log retrieval (partial index excludes system logs)
CREATE INDEX idx_logs_user 
    ON logs(user_id) 
    WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_logs_user IS 'User-specific log retrieval (excludes system logs)';

-- =====================================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: Auto-update updated_at timestamp
-- ---------------------------------------------------------------------
-- Purpose: Automatically sets updated_at to NOW() on row updates
-- Applied to: profiles, sessions
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row updates';

-- Apply to profiles table
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to sessions table
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Function: Auto-increment message counts
-- ---------------------------------------------------------------------
-- Purpose: Automatically increments message_count_main or message_count_helper
--          when a new message is inserted, and updates last_activity_at
-- Applied to: messages table (AFTER INSERT)
-- Notes: Updates parent session automatically, avoids expensive COUNT(*) queries
-- ---------------------------------------------------------------------
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

COMMENT ON FUNCTION increment_message_count() IS 'Automatically increments session message counters on new message insert';

CREATE TRIGGER increment_session_message_count 
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_message_count();

-- ---------------------------------------------------------------------
-- Function: Calculate session duration on completion
-- ---------------------------------------------------------------------
-- Purpose: Automatically calculates duration_seconds when session is marked complete
-- Applied to: sessions table (BEFORE UPDATE)
-- Notes: Duration is immutable after completion (calculated once)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate duration when session is marked complete for the first time
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        -- Calculate duration in seconds from start to completion
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_session_duration() IS 'Automatically calculates session duration on completion';

CREATE TRIGGER calculate_duration_on_completion 
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_session_duration();

-- ---------------------------------------------------------------------
-- Function: Auto-create profile after auth user registration
-- ---------------------------------------------------------------------
-- Purpose: Automatically creates a profile in profiles table when a new
--          user is registered via Supabase Auth
-- Applied to: auth.users table (AFTER INSERT)
-- Notes: 
--   - Sets initial week_reset_date to 7 days from registration
--   - SECURITY DEFINER required to access auth schema
-- ---------------------------------------------------------------------
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

COMMENT ON FUNCTION create_profile_for_new_user() IS 'Automatically creates profile after Supabase Auth registration';

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_new_user();

-- =====================================================================
-- DATABASE FUNCTIONS (CLEANUP AND MAINTENANCE)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: Delete expired sessions (7-day inactivity)
-- ---------------------------------------------------------------------
-- Purpose: Removes incomplete sessions that haven't had activity in 7+ days
-- Usage: Call via scheduled job (pg_cron, GitHub Actions, or app cron)
--        SELECT delete_expired_sessions();
-- Notes:
--   - Only deletes incomplete sessions
--   - Cascade deletes associated messages
--   - Logs cleanup execution for monitoring
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions with no activity in 7+ days
    DELETE FROM sessions
    WHERE is_completed = false
      AND last_activity_at < NOW() - INTERVAL '7 days';
    
    -- Get count of deleted rows
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

COMMENT ON FUNCTION delete_expired_sessions() IS 'Deletes incomplete sessions with 7+ days of inactivity';

-- ---------------------------------------------------------------------
-- Function: Delete old logs (30-day retention)
-- ---------------------------------------------------------------------
-- Purpose: Removes log entries older than 30 days to manage storage
-- Usage: Call via scheduled job daily
--        SELECT delete_old_logs();
-- Notes:
--   - Deletes all logs regardless of level (post-MVP could retain errors longer)
--   - Logs its own execution (will be cleaned up in 30 days)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete logs older than 30 days
    DELETE FROM logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Get count of deleted rows
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

COMMENT ON FUNCTION delete_old_logs() IS 'Deletes log entries older than 30 days';

-- ---------------------------------------------------------------------
-- Function: Reset weekly completion counts
-- ---------------------------------------------------------------------
-- Purpose: Resets current_week_completion_count to 0 for users whose
--          week_reset_date has passed
-- Usage: Call via scheduled job at Monday 00:00 UTC
--        SELECT reset_weekly_limits();
-- Alternative: Check and reset per-user on scenario start (app layer)
-- Notes:
--   - Updates week_reset_date to next Monday
--   - Logs number of users reset for monitoring
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_weekly_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    -- Reset weekly completion count for users whose reset date has passed
    UPDATE profiles
    SET current_week_completion_count = 0,
        week_reset_date = week_reset_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE week_reset_date <= NOW();
    
    -- Get count of updated rows
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

COMMENT ON FUNCTION reset_weekly_limits() IS 'Resets weekly scenario completion counts for users whose reset date has passed';

-- =====================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all application tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- RLS Policies: profiles
-- ---------------------------------------------------------------------
-- Security Model: Users can only access their own profile
-- ---------------------------------------------------------------------

-- SELECT: Users can view only their own profile
CREATE POLICY profiles_select_own_authenticated
    ON profiles FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

COMMENT ON POLICY profiles_select_own_authenticated ON profiles IS 
    'Authenticated users can view only their own profile';

-- INSERT: Users can create only their own profile (via trigger)
CREATE POLICY profiles_insert_own_authenticated
    ON profiles FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

COMMENT ON POLICY profiles_insert_own_authenticated ON profiles IS 
    'Authenticated users can insert only their own profile (triggered by auth registration)';

-- UPDATE: Users can update only their own profile
CREATE POLICY profiles_update_own_authenticated
    ON profiles FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id);

COMMENT ON POLICY profiles_update_own_authenticated ON profiles IS 
    'Authenticated users can update only their own profile';

-- DELETE: Users can delete only their own profile
CREATE POLICY profiles_delete_own_authenticated
    ON profiles FOR DELETE 
    TO authenticated
    USING (auth.uid() = id);

COMMENT ON POLICY profiles_delete_own_authenticated ON profiles IS 
    'Authenticated users can delete only their own profile';

-- ---------------------------------------------------------------------
-- RLS Policies: scenarios
-- ---------------------------------------------------------------------
-- Security Model: Read-only public data for authenticated users
-- Note: No INSERT/UPDATE/DELETE for regular users (admin-only via service role)
-- ---------------------------------------------------------------------

-- SELECT: All authenticated users can view scenarios
CREATE POLICY scenarios_select_all_authenticated
    ON scenarios FOR SELECT 
    TO authenticated
    USING (true);

COMMENT ON POLICY scenarios_select_all_authenticated ON scenarios IS 
    'All authenticated users can view scenarios (read-only public data)';

-- SELECT: Anonymous users can also view scenarios (for landing page preview)
CREATE POLICY scenarios_select_all_anon
    ON scenarios FOR SELECT 
    TO anon
    USING (true);

COMMENT ON POLICY scenarios_select_all_anon ON scenarios IS 
    'Anonymous users can view scenarios (for landing page preview)';

-- ---------------------------------------------------------------------
-- RLS Policies: sessions
-- ---------------------------------------------------------------------
-- Security Model: Users can only access their own sessions
-- ---------------------------------------------------------------------

-- SELECT: Users can view only their own sessions
CREATE POLICY sessions_select_own_authenticated
    ON sessions FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON POLICY sessions_select_own_authenticated ON sessions IS 
    'Authenticated users can view only their own sessions';

-- INSERT: Users can create sessions for themselves only
CREATE POLICY sessions_insert_own_authenticated
    ON sessions FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY sessions_insert_own_authenticated ON sessions IS 
    'Authenticated users can create sessions for themselves only';

-- UPDATE: Users can update only their own sessions
CREATE POLICY sessions_update_own_authenticated
    ON sessions FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON POLICY sessions_update_own_authenticated ON sessions IS 
    'Authenticated users can update only their own sessions';

-- DELETE: Users can delete only their own sessions
CREATE POLICY sessions_delete_own_authenticated
    ON sessions FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON POLICY sessions_delete_own_authenticated ON sessions IS 
    'Authenticated users can delete only their own sessions';

-- ---------------------------------------------------------------------
-- RLS Policies: messages
-- ---------------------------------------------------------------------
-- Security Model: Users can only access messages from their own sessions
-- Note: Messages are immutable (no UPDATE/DELETE policies)
-- ---------------------------------------------------------------------

-- SELECT: Users can view messages from their own sessions only
CREATE POLICY messages_select_own_authenticated
    ON messages FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

COMMENT ON POLICY messages_select_own_authenticated ON messages IS 
    'Authenticated users can view messages from their own sessions only';

-- INSERT: Users can insert messages into their own sessions only
CREATE POLICY messages_insert_own_authenticated
    ON messages FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

COMMENT ON POLICY messages_insert_own_authenticated ON messages IS 
    'Authenticated users can insert messages into their own sessions only';

-- NOTE: No UPDATE/DELETE policies - messages are immutable once created

-- ---------------------------------------------------------------------
-- RLS Policies: logs
-- ---------------------------------------------------------------------
-- Security Model: Users can view their own logs for transparency
-- Note: INSERT via service role only (application/system logging)
-- ---------------------------------------------------------------------

-- SELECT: Users can view their own logs
CREATE POLICY logs_select_own_authenticated
    ON logs FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON POLICY logs_select_own_authenticated ON logs IS 
    'Authenticated users can view their own logs for transparency';

-- NOTE: No INSERT/UPDATE/DELETE policies for users
-- Logging is performed via service role key in application layer

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Next Steps:
--   1. Run seed migration (002_seed_scenarios.sql) to insert initial scenarios
--   2. Configure scheduled jobs for cleanup functions:
--      - delete_expired_sessions() - Daily at 02:00 UTC
--      - delete_old_logs() - Daily at 03:00 UTC
--      - reset_weekly_limits() - Monday at 00:00 UTC
--   3. Verify RLS policies with test user accounts
--   4. Test trigger functionality (profile creation, message counts, duration)
-- =====================================================================

