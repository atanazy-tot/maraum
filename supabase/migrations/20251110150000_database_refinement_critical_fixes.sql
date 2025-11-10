/*
 * migration: database_refinement_critical_fixes
 * created: 2025-11-10 15:00:00 UTC
 * author: database refinement process
 *
 * purpose:
 *   implements critical fixes and improvements from database schema review
 *   addresses 46 identified issues across data integrity, performance, and security
 *
 * affected tables:
 *   - profiles: email uniqueness, timestamp consistency
 *   - scenarios: updated_at, sort_order, constraints
 *   - sessions: completed_at automation, redundant columns, constraints
 *   - messages: user_id denormalization, enums, true immutability
 *   - logs: index improvements
 *
 * special considerations:
 *   - backward compatible where possible
 *   - includes data migration for existing records
 *   - messages are truly immutable (no updates allowed)
 *   - improves rls performance with denormalized user_id
 *   - streaming handled on ui side, not database level
 *
 * rollback:
 *   complex - involves type changes and data migrations
 *   backup database before applying
 */

-- ==============================================================================
-- section 1: extensions
-- ==============================================================================
-- issue #6: ensure pgcrypto extension is available for gen_random_uuid()
create extension if not exists pgcrypto;

-- issue #42: enable citext for case-insensitive email handling
create extension if not exists citext;

-- ==============================================================================
-- section 2: create enums for type safety
-- ==============================================================================
-- issue #13: convert free-text enums to proper postgresql types

-- create enum for message roles
create type message_role as enum ('user', 'scenario', 'helper');

-- create enum for chat types
create type chat_type_enum as enum ('main', 'helper');

-- ==============================================================================
-- section 3: table structure modifications
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- profiles table modifications
-- ------------------------------------------------------------------------------
-- issue #42: make email authoritative and case-insensitive
alter table profiles
  alter column email type citext;

-- add unique constraint on email
create unique index if not exists uniq_profiles_email on profiles(email);

-- ------------------------------------------------------------------------------
-- scenarios table modifications
-- ------------------------------------------------------------------------------
-- issue #38: add updated_at timestamp for consistency
alter table scenarios
  add column if not exists updated_at timestamptz not null default now();

-- issue #38: add sort_order for explicit display ordering
alter table scenarios
  add column if not exists sort_order smallint not null default 0;

-- issue #17: add unique constraint on title
alter table scenarios
  add constraint scenarios_title_unique unique (title);

-- issue #16: add size constraint on emoji
alter table scenarios
  add constraint scenarios_emoji_size_limit
  check (octet_length(emoji) <= 16);

-- attach updated_at trigger to scenarios
create trigger update_scenarios_updated_at
  before update on scenarios
  for each row
  execute function update_updated_at_column();

-- ------------------------------------------------------------------------------
-- sessions table modifications
-- ------------------------------------------------------------------------------
-- issue #5: remove redundant created_at column (use started_at)
-- first, update any code that might reference it (document this)
alter table sessions
  drop column if exists created_at;

-- issue #8: add temporal validation constraints
alter table sessions
  add constraint sessions_completed_after_started
  check (completed_at is null or completed_at >= started_at);

-- issue #8: add message count non-negative constraints
alter table sessions
  add constraint sessions_message_counts_non_negative
  check (message_count_main >= 0 and message_count_helper >= 0);

-- issue #12: add duration validation
alter table sessions
  add constraint sessions_duration_non_negative
  check (duration_seconds is null or duration_seconds >= 0);

-- issue #1: add constraint ensuring completed sessions have completed_at
alter table sessions
  add constraint sessions_completed_at_required
  check (
    (is_completed = true and completed_at is not null) or
    (is_completed = false and completed_at is null)
  );

-- ------------------------------------------------------------------------------
-- messages table modifications
-- ------------------------------------------------------------------------------
-- issue #7: rename timestamp to sent_at for clarity and consistency
alter table messages
  rename column timestamp to sent_at;

-- issue #18: add user_id for better rls performance
-- this is denormalized but significantly improves query performance
alter table messages
  add column if not exists user_id uuid;

-- backfill user_id from sessions for existing messages
update messages
set user_id = sessions.user_id
from sessions
where messages.session_id = sessions.id
  and messages.user_id is null;

-- make user_id not null after backfill
alter table messages
  alter column user_id set not null;

-- add foreign key for user_id
alter table messages
  add constraint messages_user_id_fkey
  foreign key (user_id)
  references profiles(id)
  on delete cascade
  on update cascade;

-- issue #15: add content size limit
alter table messages
  add constraint messages_content_size_limit
  check (char_length(content) <= 8000);

-- issue #13: convert role and chat_type to enums
-- step 1: add new enum columns
alter table messages
  add column if not exists role_new message_role;

alter table messages
  add column if not exists chat_type_new chat_type_enum;

-- step 2: migrate existing data
update messages
set role_new = role::message_role,
    chat_type_new = chat_type::chat_type_enum;

-- step 3: drop old columns and rename new ones
alter table messages
  drop column role,
  drop column chat_type;

alter table messages
  rename column role_new to role;

alter table messages
  rename column chat_type_new to chat_type;

-- step 4: make new columns not null
alter table messages
  alter column role set not null,
  alter column chat_type set not null;

-- issue #14: add cross-field validation for role and chat_type combinations
alter table messages
  add constraint messages_role_chat_type_valid
  check (
    (role = 'scenario' and chat_type = 'main') or
    (role = 'helper' and chat_type = 'helper') or
    (role = 'user' and chat_type in ('main', 'helper'))
  );

-- issue #46: add idempotency key for safe retries
alter table messages
  add column if not exists client_message_id uuid;

create unique index idx_messages_idempotency
  on messages(session_id, client_message_id)
  where client_message_id is not null;

-- ==============================================================================
-- section 4: index improvements
-- ==============================================================================

-- issue #19: add session log index
create index if not exists idx_logs_session
  on logs(session_id, created_at desc)
  where session_id is not null;

-- issue #20: add scenario-specific history indexes
create index if not exists idx_sessions_scenario_history
  on sessions(user_id, scenario_id, completed_at desc)
  where is_completed = true;

create index if not exists idx_sessions_user_scenario
  on sessions(user_id, scenario_id, is_completed);

-- issue #21: add stable pagination index for messages
-- note: existing index on (session_id, timestamp) is replaced
drop index if exists idx_messages_session_chronological;

create index idx_messages_session_time_id
  on messages(session_id, sent_at, id);

-- update chat_type specific index with new name
drop index if exists idx_messages_chat_type;

create index idx_messages_chat_type_ordered
  on messages(session_id, chat_type, sent_at);

-- issue #41: add scenario id index for analytics
create index if not exists idx_sessions_scenario
  on sessions(scenario_id, is_completed);

-- issue #23: add gin index for jsonb metadata queries on logs
create index if not exists idx_logs_metadata
  on logs using gin (metadata);

-- ==============================================================================
-- section 5: trigger and function modifications
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- issue #1: auto-set completed_at when session is marked complete
-- ------------------------------------------------------------------------------
create or replace function calculate_session_duration()
returns trigger as $$
begin
    -- only process when session is marked complete
    if new.is_completed = true and old.is_completed = false then
        -- auto-set completed_at if not provided
        new.completed_at = coalesce(new.completed_at, now());

        -- calculate duration from start to completion
        new.duration_seconds = extract(epoch from (new.completed_at - new.started_at))::integer;
    end if;

    return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- issue #11: fix message count trigger to handle invalid chat_type
-- ------------------------------------------------------------------------------
create or replace function increment_message_count()
returns trigger as $$
begin
    -- increment appropriate counter based on chat_type
    if new.chat_type = 'main' then
        update sessions
        set message_count_main = message_count_main + 1,
            last_activity_at = now()
        where id = new.session_id;
    elsif new.chat_type = 'helper' then
        update sessions
        set message_count_helper = message_count_helper + 1,
            last_activity_at = now()
        where id = new.session_id;
    else
        -- raise exception for invalid chat_type (defense in depth)
        raise exception 'invalid chat_type: %', new.chat_type;
    end if;

    return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- issue #37: enforce message immutability at database level
-- ------------------------------------------------------------------------------
create or replace function prevent_message_updates()
returns trigger as $$
begin
    -- messages are truly immutable - no updates allowed
    -- streaming is handled on the ui side, not database level
    raise exception 'messages are immutable and cannot be updated';
end;
$$ language plpgsql;

create trigger messages_immutable
  before update on messages
  for each row
  execute function prevent_message_updates();

-- ------------------------------------------------------------------------------
-- issue #3: prevent messages in completed sessions
-- ------------------------------------------------------------------------------
create or replace function prevent_messages_in_completed_sessions()
returns trigger as $$
declare
    session_completed boolean;
begin
    -- check if session is completed
    select is_completed into session_completed
    from sessions
    where id = new.session_id;

    if session_completed = true then
        raise exception 'cannot add messages to completed session: %', new.session_id;
    end if;

    return new;
end;
$$ language plpgsql;

create trigger check_session_not_completed
  before insert on messages
  for each row
  execute function prevent_messages_in_completed_sessions();

-- ------------------------------------------------------------------------------
-- issue #18: auto-populate user_id from session for new messages
-- ------------------------------------------------------------------------------
create or replace function populate_message_user_id()
returns trigger as $$
begin
    -- populate user_id from parent session if not provided
    if new.user_id is null then
        select user_id into new.user_id
        from sessions
        where id = new.session_id;
    end if;

    return new;
end;
$$ language plpgsql;

create trigger populate_user_id_on_insert
  before insert on messages
  for each row
  execute function populate_message_user_id();

-- ------------------------------------------------------------------------------
-- issue #9 & #10: maintain denormalized counts with triggers
-- ------------------------------------------------------------------------------
create or replace function update_profile_completion_counts()
returns trigger as $$
begin
    if tg_op = 'UPDATE' then
        -- session just became completed
        if new.is_completed = true and old.is_completed = false then
            update profiles
            set completed_scenario_count = completed_scenario_count + 1,
                current_week_completion_count = current_week_completion_count + 1,
                updated_at = now()
            where id = new.user_id;
        -- session became uncompleted (rare, but handle it)
        elsif new.is_completed = false and old.is_completed = true then
            update profiles
            set completed_scenario_count = greatest(0, completed_scenario_count - 1),
                current_week_completion_count = greatest(0, current_week_completion_count - 1),
                updated_at = now()
            where id = new.user_id;
        end if;
    elsif tg_op = 'DELETE' then
        -- decrement if deleting a completed session
        if old.is_completed = true then
            update profiles
            set completed_scenario_count = greatest(0, completed_scenario_count - 1),
                current_week_completion_count = greatest(0, current_week_completion_count - 1),
                updated_at = now()
            where id = old.user_id;
        end if;
    end if;

    return coalesce(new, old);
end;
$$ language plpgsql;

create trigger maintain_profile_counts
  after insert or update or delete on sessions
  for each row
  execute function update_profile_completion_counts();

-- ------------------------------------------------------------------------------
-- issue #2: fix weekly reset logic to use monday boundaries
-- ------------------------------------------------------------------------------
-- update the profile creation function to set proper monday reset
create or replace function create_profile_for_new_user()
returns trigger as $$
declare
    next_monday timestamptz;
begin
    -- issue #25: validate email is not null or empty
    if new.email is null or new.email = '' then
        raise exception 'email cannot be empty';
    end if;

    -- calculate next monday at 00:00 utc
    -- date_trunc('week', timestamp) gives monday of current week
    -- if today is monday or later, add 7 days to get next monday
    next_monday := date_trunc('week', now() at time zone 'utc') + interval '7 days';

    insert into profiles (id, email, week_reset_date)
    values (
        new.id,
        new.email,
        next_monday
    );

    return new;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;  -- issue #26: lock search_path

-- update the weekly reset function to be idempotent
create or replace function reset_weekly_limits()
returns integer as $$
declare
    reset_count integer;
    next_monday timestamptz;
begin
    -- calculate next monday boundary (idempotent)
    next_monday := date_trunc('week', now() at time zone 'utc') + interval '7 days';

    update profiles
    set current_week_completion_count = 0,
        week_reset_date = next_monday,
        updated_at = now()
    where week_reset_date <= now();

    get diagnostics reset_count = row_count;

    -- issue #32: enhanced logging with metadata
    insert into logs (level, event_type, metadata)
    values (
        'info',
        'weekly_limit_reset',
        jsonb_build_object(
            'reset_users', reset_count,
            'reset_timestamp', now(),
            'next_monday', next_monday
        )
    );

    return reset_count;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;  -- issue #26: lock search_path

-- ------------------------------------------------------------------------------
-- issue #26: lock search_path on all other security definer functions
-- ------------------------------------------------------------------------------
create or replace function delete_expired_sessions()
returns integer as $$
declare
    deleted_count integer;
    min_ts timestamptz;
    max_ts timestamptz;
begin
    -- capture time window for logging
    select
        min(last_activity_at),
        max(last_activity_at)
    into min_ts, max_ts
    from sessions
    where is_completed = false
      and last_activity_at < now() - interval '7 days';

    delete from sessions
    where is_completed = false
      and last_activity_at < now() - interval '7 days';

    get diagnostics deleted_count = row_count;

    -- issue #32: enhanced logging
    insert into logs (level, event_type, metadata)
    values (
        'info',
        'session_expiration_cleanup',
        jsonb_build_object(
            'job_id', gen_random_uuid(),
            'deleted_sessions', deleted_count,
            'min_timestamp', min_ts,
            'max_timestamp', max_ts,
            'cleanup_timestamp', now()
        )
    );

    return deleted_count;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;  -- issue #26: lock search_path

create or replace function delete_old_logs()
returns integer as $$
declare
    deleted_count integer;
begin
    delete from logs
    where created_at < now() - interval '30 days';

    get diagnostics deleted_count = row_count;

    -- log the cleanup execution
    insert into logs (level, event_type, metadata)
    values (
        'info',
        'cleanup_job_executed',
        jsonb_build_object(
            'job_id', gen_random_uuid(),
            'deleted_logs', deleted_count,
            'cleanup_timestamp', now()
        )
    );

    return deleted_count;
end;
$$ language plpgsql
security definer
set search_path = public, pg_temp;  -- issue #26: lock search_path

-- ------------------------------------------------------------------------------
-- issue #40: update foreign keys to include explicit on update behavior
-- ------------------------------------------------------------------------------
-- sessions.user_id
alter table sessions
  drop constraint if exists sessions_user_id_fkey,
  add constraint sessions_user_id_fkey
    foreign key (user_id)
    references profiles(id)
    on delete cascade
    on update cascade;

-- sessions.scenario_id
alter table sessions
  drop constraint if exists sessions_scenario_id_fkey,
  add constraint sessions_scenario_id_fkey
    foreign key (scenario_id)
    references scenarios(id)
    on delete restrict
    on update cascade;

-- messages.session_id (already has user_id added above)
alter table messages
  drop constraint if exists messages_session_id_fkey,
  add constraint messages_session_id_fkey
    foreign key (session_id)
    references sessions(id)
    on delete cascade
    on update cascade;

-- logs foreign keys
alter table logs
  drop constraint if exists logs_user_id_fkey,
  add constraint logs_user_id_fkey
    foreign key (user_id)
    references profiles(id)
    on delete set null
    on update cascade;

alter table logs
  drop constraint if exists logs_session_id_fkey,
  add constraint logs_session_id_fkey
    foreign key (session_id)
    references sessions(id)
    on delete set null
    on update cascade;

-- ==============================================================================
-- section 6: row-level security updates
-- ==============================================================================

-- issue #18: update messages rls to use denormalized user_id
drop policy if exists messages_select_own on messages;
drop policy if exists messages_insert_own on messages;

create policy messages_select_own
  on messages for select
  using (auth.uid() = user_id);

create policy messages_insert_own
  on messages for insert
  with check (auth.uid() = user_id);

-- issue #27: remove user-facing insert policy on profiles
-- profiles should only be created via auth trigger
drop policy if exists profiles_insert_own on profiles;

-- ==============================================================================
-- section 7: data integrity verification
-- ==============================================================================

-- backfill any existing sessions that have is_completed=true but null completed_at
-- this shouldn't happen, but fix any existing data issues
update sessions
set completed_at = last_activity_at
where is_completed = true
  and completed_at is null;

-- recalculate durations for any sessions missing them
update sessions
set duration_seconds = extract(epoch from (completed_at - started_at))::integer
where is_completed = true
  and completed_at is not null
  and duration_seconds is null;

-- verify and fix profile completion counts
update profiles p
set completed_scenario_count = (
    select count(*)
    from sessions s
    where s.user_id = p.id
      and s.is_completed = true
)
where completed_scenario_count != (
    select count(*)
    from sessions s
    where s.user_id = p.id
      and s.is_completed = true
);

-- ==============================================================================
-- section 8: update scenarios with sort_order
-- ==============================================================================

-- set initial sort order for existing scenarios
update scenarios set sort_order = 1, updated_at = now() where id = 1; -- marketplace
update scenarios set sort_order = 2, updated_at = now() where id = 2; -- party
update scenarios set sort_order = 3, updated_at = now() where id = 3; -- kebab

-- ==============================================================================
-- migration complete
-- ==============================================================================

/*
 * post-migration notes:
 *
 * 1. messages are truly immutable:
 *    - no updates allowed once inserted
 *    - streaming effects handled on ui side, not database level
 *    - messages only inserted when complete
 *
 * 2. the messages.user_id denormalization significantly improves rls performance:
 *    - populated via trigger on insert
 *    - eliminates expensive exists subqueries in rls policies
 *
 * 3. message immutability is enforced at database level:
 *    - all update attempts will raise an exception
 *    - this is a hard constraint for data integrity
 *
 * 4. weekly reset logic is now idempotent and uses monday boundaries:
 *    - safe to run multiple times
 *    - automatically recovers from missed runs
 *
 * 5. completion counts are now maintained via triggers:
 *    - automatically updated when sessions complete
 *    - decremented if sessions are deleted or uncompleted
 *
 * 6. all security definer functions now have locked search_path:
 *    - prevents privilege escalation attacks
 *
 * 7. timestamps are now more consistent:
 *    - messages: sent_at (renamed from timestamp)
 *    - sessions: removed redundant created_at
 *    - scenarios: added updated_at
 *
 * application changes required:
 * - update message queries to use 'sent_at' instead of 'timestamp'
 * - update session queries to use 'started_at' instead of 'created_at'
 * - handle streaming on ui side (don't save partial messages)
 * - use client_message_id for idempotent message creation
 * - update message role/chat_type handling for enum types
 */
