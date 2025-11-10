/*
 * migration: database_refinement_additional_improvements
 * created: 2025-11-10 16:00:00 UTC
 * author: database refinement process
 *
 * purpose:
 *   implements additional improvements from database schema review
 *   addresses remaining selected issues after first migration
 *
 * affected tables:
 *   - scenarios: convert id to serial, restrict anonymous access
 *   - messages: rename role enum values for clarity
 *   - logs: add clarifying comments about rls
 *
 * special considerations:
 *   - breaking changes: scenario id now auto-increments
 *   - breaking changes: message role values renamed
 *   - anonymous users now use restricted view for scenarios
 *   - cleanup functions now have error handling
 *
 * rollback:
 *   complex - involves enum changes and sequence creation
 *   backup database before applying
 */

-- ==============================================================================
-- section 1: scenarios table improvements
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- issue #34: convert scenarios.id to serial (auto-increment)
-- ------------------------------------------------------------------------------

-- step 1: create sequence for scenarios
-- start at 4 since we have existing records 1, 2, 3
create sequence if not exists scenarios_id_seq start with 4;

-- step 2: attach sequence to id column
alter table scenarios
  alter column id set default nextval('scenarios_id_seq');

-- step 3: set sequence ownership so it's dropped with column
alter sequence scenarios_id_seq owned by scenarios.id;

-- step 4: set current value to max existing id
select setval('scenarios_id_seq', coalesce(max(id), 0) + 1, false)
from scenarios;

-- now future scenario inserts will auto-increment from 4 onwards
-- existing scenarios (1, 2, 3) remain unchanged

-- ------------------------------------------------------------------------------
-- issue #28: restrict anonymous access to scenarios
-- ------------------------------------------------------------------------------

-- create public view with only safe columns for anonymous/authenticated users
create or replace view public_scenarios as
select
  id,
  title,
  emoji,
  sort_order,
  is_active
from scenarios
where is_active = true;

-- add comment explaining the view
comment on view public_scenarios is 'public view of scenarios with restricted columns - hides initial messages and internal details';

-- revoke direct table access from anon role
revoke all on scenarios from anon;

-- grant select on public view to anon and authenticated
grant select on public_scenarios to anon;
grant select on public_scenarios to authenticated;

-- authenticated users can still access full scenarios table via rls
-- the existing rls policy allows authenticated users to select from scenarios
-- so authenticated users have access to both the view and the full table

-- ==============================================================================
-- section 2: message role enum improvements
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- issue #36: rename message roles for clarity
-- ------------------------------------------------------------------------------

-- create new enum with clearer naming
-- 'user' - human user messages
-- 'main_assistant' - ai responses in main (魔) chat
-- 'helper_assistant' - ai responses in helper (間) chat
create type message_role_new as enum ('user', 'main_assistant', 'helper_assistant');

-- add new column with new enum type
alter table messages
  add column if not exists role_temp message_role_new;

-- migrate existing data
update messages
set role_temp = case
  when role = 'scenario' then 'main_assistant'::message_role_new
  when role = 'helper' then 'helper_assistant'::message_role_new
  when role = 'user' then 'user'::message_role_new
end;

-- drop old column and enum
alter table messages
  drop column role;

drop type message_role;

-- rename new column and type
alter table messages
  rename column role_temp to role;

alter type message_role_new rename to message_role;

-- make column not null
alter table messages
  alter column role set not null;

-- update the cross-field constraint to use new role values
alter table messages
  drop constraint if exists messages_role_chat_type_valid;

alter table messages
  add constraint messages_role_chat_type_valid
  check (
    (role = 'main_assistant' and chat_type = 'main') or
    (role = 'helper_assistant' and chat_type = 'helper') or
    (role = 'user' and chat_type in ('main', 'helper'))
  );

-- ==============================================================================
-- section 3: logs table documentation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- issue #24: clarify logs rls policy
-- ------------------------------------------------------------------------------

-- add comment to logs table explaining the rls approach
comment on table logs is 'operational event log with 30-day retention. inserts performed via service role key (bypasses rls). users can read their own logs via rls policy.';

-- add comment to the select policy
comment on policy logs_select_own_authenticated on logs is 'allows users to view their own logs for transparency. service role bypasses rls for inserts.';

-- ==============================================================================
-- section 4: error handling for cleanup functions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- issue #45: add error monitoring for cleanup functions
-- ------------------------------------------------------------------------------

-- enhance delete_expired_sessions with error handling
create or replace function delete_expired_sessions()
returns integer as $$
declare
    deleted_count integer;
    min_ts timestamptz;
    max_ts timestamptz;
    error_message text;
    error_detail text;
begin
    -- capture time window for logging
    select
        min(last_activity_at),
        max(last_activity_at)
    into min_ts, max_ts
    from sessions
    where is_completed = false
      and last_activity_at < now() - interval '7 days';

    -- perform deletion with error handling
    begin
        delete from sessions
        where is_completed = false
          and last_activity_at < now() - interval '7 days';

        get diagnostics deleted_count = row_count;

        -- log successful cleanup
        insert into logs (level, event_type, metadata)
        values (
            'info',
            'session_expiration_cleanup',
            jsonb_build_object(
                'job_id', gen_random_uuid(),
                'deleted_sessions', deleted_count,
                'min_timestamp', min_ts,
                'max_timestamp', max_ts,
                'cleanup_timestamp', now(),
                'status', 'success'
            )
        );

        return deleted_count;

    exception
        when others then
            -- capture error details
            get stacked diagnostics
                error_message = message_text,
                error_detail = pg_exception_detail;

            -- log error for monitoring
            insert into logs (level, event_type, metadata)
            values (
                'error',
                'session_expiration_cleanup',
                jsonb_build_object(
                    'job_id', gen_random_uuid(),
                    'error_message', error_message,
                    'error_detail', error_detail,
                    'cleanup_timestamp', now(),
                    'status', 'failed'
                )
            );

            -- re-raise exception to ensure calling code knows about failure
            raise;
    end;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;

-- enhance delete_old_logs with error handling
create or replace function delete_old_logs()
returns integer as $$
declare
    deleted_count integer;
    error_message text;
    error_detail text;
begin
    -- perform deletion with error handling
    begin
        delete from logs
        where created_at < now() - interval '30 days';

        get diagnostics deleted_count = row_count;

        -- log successful cleanup
        insert into logs (level, event_type, metadata)
        values (
            'info',
            'cleanup_job_executed',
            jsonb_build_object(
                'job_id', gen_random_uuid(),
                'deleted_logs', deleted_count,
                'cleanup_timestamp', now(),
                'status', 'success'
            )
        );

        return deleted_count;

    exception
        when others then
            -- capture error details
            get stacked diagnostics
                error_message = message_text,
                error_detail = pg_exception_detail;

            -- log error for monitoring
            insert into logs (level, event_type, metadata)
            values (
                'error',
                'cleanup_job_executed',
                jsonb_build_object(
                    'job_id', gen_random_uuid(),
                    'error_message', error_message,
                    'error_detail', error_detail,
                    'cleanup_timestamp', now(),
                    'status', 'failed'
                )
            );

            -- re-raise exception to ensure calling code knows about failure
            raise;
    end;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;

-- enhance reset_weekly_limits with error handling
create or replace function reset_weekly_limits()
returns integer as $$
declare
    reset_count integer;
    next_monday timestamptz;
    error_message text;
    error_detail text;
begin
    -- calculate next monday boundary (idempotent)
    next_monday := date_trunc('week', now() at time zone 'utc') + interval '7 days';

    -- perform reset with error handling
    begin
        update profiles
        set current_week_completion_count = 0,
            week_reset_date = next_monday,
            updated_at = now()
        where week_reset_date <= now();

        get diagnostics reset_count = row_count;

        -- log successful reset
        insert into logs (level, event_type, metadata)
        values (
            'info',
            'weekly_limit_reset',
            jsonb_build_object(
                'reset_users', reset_count,
                'reset_timestamp', now(),
                'next_monday', next_monday,
                'status', 'success'
            )
        );

        return reset_count;

    exception
        when others then
            -- capture error details
            get stacked diagnostics
                error_message = message_text,
                error_detail = pg_exception_detail;

            -- log error for monitoring
            insert into logs (level, event_type, metadata)
            values (
                'error',
                'weekly_limit_reset',
                jsonb_build_object(
                    'error_message', error_message,
                    'error_detail', error_detail,
                    'reset_timestamp', now(),
                    'status', 'failed'
                )
            );

            -- re-raise exception to ensure calling code knows about failure
            raise;
    end;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;

-- ==============================================================================
-- migration complete
-- ==============================================================================

/*
 * post-migration notes:
 *
 * 1. scenario ids now auto-increment:
 *    - existing scenarios (1, 2, 3) unchanged
 *    - new scenarios will start at id 4, 5, 6, etc.
 *    - no need to specify id on insert
 *
 * 2. anonymous users restricted to public_scenarios view:
 *    - only see: id, title, emoji, sort_order, is_active
 *    - hidden: initial_message_main, initial_message_helper, created_at, updated_at
 *    - authenticated users still have full access via rls
 *
 * 3. message roles renamed for clarity:
 *    - 'scenario' -> 'main_assistant'
 *    - 'helper' -> 'helper_assistant'
 *    - 'user' stays 'user'
 *    - better semantic meaning
 *
 * 4. cleanup functions now have error handling:
 *    - errors logged to logs table with 'error' level
 *    - includes error message and details
 *    - exceptions re-raised for external monitoring
 *    - status field in metadata ('success' or 'failed')
 *
 * application changes required:
 * - anonymous users: query public_scenarios instead of scenarios
 * - authenticated users: can query scenarios directly (rls allows it)
 * - update message role handling:
 *   - 'scenario' -> 'main_assistant'
 *   - 'helper' -> 'helper_assistant'
 * - when inserting new scenarios, don't specify id (auto-generated)
 * - monitor logs table for 'error' level cleanup failures
 */
