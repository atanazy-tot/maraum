/*
 * migration: disable_rls_for_development
 * created: 2025-11-11 12:00:00 UTC
 * author: development team
 *
 * purpose:
 *   temporarily disables all row-level security (rls) policies for early development
 *   this allows unrestricted access to all tables for testing and development
 *
 * ⚠️  WARNING: DEVELOPMENT ONLY ⚠️
 *   this migration removes all security constraints from the database
 *   DO NOT use this migration in production environments
 *   re-enable rls before deploying to production
 *
 * affected tables:
 *   - profiles: user profiles with completion tracking
 *   - scenarios: language learning scenarios
 *   - sessions: conversation sessions
 *   - messages: chat messages
 *   - logs: operational event logs
 *
 * special considerations:
 *   - all authenticated and anonymous users will have full access to all data
 *   - no user isolation or data protection during development
 *   - re-enabling rls will require running a separate migration
 *
 * rollback:
 *   to re-enable security, create a new migration that:
 *   1. enables rls on all tables
 *   2. recreates all policies from original migrations
 */

-- ==============================================================================
-- section 1: drop all rls policies
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- table: profiles
-- -----------------------------------------------------------------------------
-- drop all user access policies on profiles table
-- these policies restricted users to only see and modify their own profile

drop policy if exists profiles_select_own_authenticated on profiles;
drop policy if exists profiles_insert_own_authenticated on profiles;
drop policy if exists profiles_update_own_authenticated on profiles;
drop policy if exists profiles_delete_own_authenticated on profiles;

-- -----------------------------------------------------------------------------
-- table: scenarios
-- -----------------------------------------------------------------------------
-- drop public read policies on scenarios table
-- these policies allowed all users to view scenario information

drop policy if exists scenarios_select_all_authenticated on scenarios;
drop policy if exists scenarios_select_all_anon on scenarios;

-- -----------------------------------------------------------------------------
-- table: sessions
-- -----------------------------------------------------------------------------
-- drop user-specific session policies
-- these policies restricted users to only access their own sessions

drop policy if exists sessions_select_own_authenticated on sessions;
drop policy if exists sessions_insert_own_authenticated on sessions;
drop policy if exists sessions_update_own_authenticated on sessions;
drop policy if exists sessions_delete_own_authenticated on sessions;

-- -----------------------------------------------------------------------------
-- table: messages
-- -----------------------------------------------------------------------------
-- drop message access policies
-- these policies used denormalized user_id to restrict message access
-- note: policy names may vary based on which migration was applied

drop policy if exists messages_select_own_authenticated on messages;
drop policy if exists messages_insert_own_authenticated on messages;
drop policy if exists messages_select_own on messages;
drop policy if exists messages_insert_own on messages;

-- -----------------------------------------------------------------------------
-- table: logs
-- -----------------------------------------------------------------------------
-- drop log viewing policy
-- this policy allowed users to view their own logs

drop policy if exists logs_select_own_authenticated on logs;

-- ==============================================================================
-- section 2: disable row-level security on all tables
-- ==============================================================================

-- ⚠️  disabling rls allows unrestricted access to all table data
-- all authenticated and anonymous users can now:
--   - select, insert, update, delete any rows in these tables
--   - bypass all user isolation and security checks

alter table profiles disable row level security;
alter table scenarios disable row level security;
alter table sessions disable row level security;
alter table messages disable row level security;
alter table logs disable row level security;

-- ==============================================================================
-- migration complete
-- ==============================================================================

/*
 * post-migration notes:
 *
 * ⚠️  CRITICAL SECURITY WARNING ⚠️
 *
 * all row-level security has been disabled on:
 *   - profiles: users can see and modify any profile
 *   - scenarios: unrestricted read/write access
 *   - sessions: users can access any session regardless of ownership
 *   - messages: users can read and write any messages
 *   - logs: users can view all logs including system logs
 *
 * development implications:
 *   - faster iteration without authentication constraints
 *   - easier debugging with full data visibility
 *   - simpler testing without user context switching
 *   - no need to authenticate to access data
 *
 * before production deployment:
 *   1. create a migration to re-enable rls on all tables
 *   2. recreate all security policies from original migrations
 *   3. test thoroughly with multiple user accounts
 *   4. verify user isolation and data protection
 *   5. audit all api endpoints for security implications
 *
 * alternative approach:
 *   instead of disabling rls entirely, consider:
 *   - using service role key for development
 *   - creating permissive development-only policies
 *   - using database roles for different access levels
 */

