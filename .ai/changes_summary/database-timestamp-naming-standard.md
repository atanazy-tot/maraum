# Database Timestamp Naming Standard

**Created:** 2025-11-10
**Purpose:** Establish consistent timestamp column naming conventions across all database tables
**Related Issue:** #39 from database refinement review

---

## Naming Conventions

### Standard Timestamp Columns

All tables should use these standard timestamp column names where applicable:

1. **`created_at`** - When the database record was first created
   - Type: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Always present on tables (except static reference data)
   - Never updated after initial insert
   - Represents database record creation, not business event time

2. **`updated_at`** - When the database record was last modified
   - Type: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Present on tables that allow updates
   - Automatically maintained via `update_updated_at_column()` trigger
   - Updated on every UPDATE operation

### Business Event Timestamps

For business-specific events, use descriptive semantic names:

3. **`started_at`** - When a business process/session began
   - Example: `sessions.started_at` (when user started scenario)
   - Type: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

4. **`completed_at`** - When a business process finished
   - Example: `sessions.completed_at` (when scenario completed)
   - Type: `TIMESTAMPTZ` (nullable until completed)

5. **`sent_at`** - When a message was sent/transmitted
   - Example: `messages.sent_at` (when message was sent)
   - Type: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Preferred over generic `timestamp` for clarity

6. **`expires_at`** - When something expires
   - Type: `TIMESTAMPTZ`
   - Example: authentication tokens, temporary data

7. **`deleted_at`** - For soft-delete patterns
   - Type: `TIMESTAMPTZ` (NULL = not deleted)
   - If implementing soft deletes in future

---

## Current Schema Status

### Tables Using Standard Pattern ✅

**profiles:**
- `created_at` - record creation ✅
- `updated_at` - last modification ✅
- `week_reset_date` - business event (acceptable variation)

**scenarios:**
- `created_at` - record creation ✅
- `updated_at` - last modification ✅

**sessions:**
- `started_at` - business event (when session started) ✅
- `last_activity_at` - business event (last interaction) ✅
- `completed_at` - business event (when finished) ✅
- `updated_at` - last modification ✅
- ~~`created_at`~~ - REMOVED (redundant with started_at) ✅

**messages:**
- `sent_at` - business event (when message sent) ✅ (renamed from `timestamp`)
- `created_at` - record creation ✅

**logs:**
- `created_at` - record creation ✅

### Deviations from Standard (Acceptable)

1. **`week_reset_date`** (profiles)
   - Not a timestamp of past event, but future scheduled time
   - Acceptable: clearly semantic, not generic

2. **`last_activity_at`** (sessions)
   - Specific semantic meaning for session tracking
   - Acceptable: clear business meaning

---

## Migration History

### Migration 20251110150000 - Timestamp Consistency
- Removed redundant `sessions.created_at` (use `started_at`)
- Renamed `messages.timestamp` to `messages.sent_at`
- Added `scenarios.updated_at`

### Future Considerations

If soft-delete pattern is implemented:
- Add `deleted_at TIMESTAMPTZ` to relevant tables
- Update RLS policies to filter `WHERE deleted_at IS NULL`

---

## Guidelines for New Tables

When creating new tables, follow this checklist:

### Always Include
- [ ] `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### Include When Applicable
- [ ] `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (if table allows updates)
- [ ] Attach `update_updated_at_column()` trigger for `updated_at`
- [ ] Business-specific semantic timestamp names (e.g., `started_at`, `completed_at`)

### Never Use
- ❌ Generic `timestamp` (use specific name like `sent_at`, `occurred_at`)
- ❌ `date_created` (use `created_at` for consistency)
- ❌ `modified_at` (use `updated_at` for consistency)
- ❌ `ts` or other abbreviations (spell out fully)

---

## Examples

### ✅ Good Examples

```sql
-- user action log
create table user_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  action_type text not null,
  occurred_at timestamptz not null default now(),  -- when action happened
  created_at timestamptz not null default now()    -- when record created
);

-- scheduled job tracking
create table scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  scheduled_for timestamptz not null,  -- when job should run
  started_at timestamptz,              -- when job actually started
  completed_at timestamptz,            -- when job finished
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### ❌ Bad Examples

```sql
-- inconsistent naming
create table bad_table (
  id serial primary key,
  date_created timestamp,     -- should be: created_at timestamptz
  last_modified timestamp,    -- should be: updated_at timestamptz
  ts timestamp,               -- should be: specific name like sent_at
  time bigint                 -- should be: timestamptz, not unix timestamp
);
```

---

## Rationale

### Why TIMESTAMPTZ?
- Stores timestamps in UTC
- Converts to local timezone on retrieval
- Prevents timezone ambiguity bugs
- Standard PostgreSQL best practice

### Why Semantic Names?
- `sent_at` immediately clear it's when message was sent
- `completed_at` clearly indicates completion time
- Reduces cognitive load when reading queries
- Self-documenting schema

### Why Standard created_at/updated_at?
- Instant recognition by developers
- Consistent with PostgreSQL conventions
- Compatible with ORMs and audit tools
- Clear distinction from business timestamps

---

## Enforcement

### Code Review Checklist
- [ ] New timestamp columns follow naming standard
- [ ] Type is TIMESTAMPTZ (not TIMESTAMP)
- [ ] `updated_at` has trigger attached
- [ ] Business timestamps have semantic names
- [ ] No generic names like `timestamp` or `date`

### Migration Review
- [ ] Verify timestamp naming consistency
- [ ] Check for redundant timestamp columns
- [ ] Confirm triggers attached for `updated_at`

---

## Related Documentation

- `supabase/migrations/20251110150000_database_refinement_critical_fixes.sql`
- `.ai/db-plan.md` - Original database schema design
- `.cursor/rules/postgres-sql-style-guide.mdc` - SQL style guide

---

**Status:** ✅ Active Standard
**Last Updated:** 2025-11-10
**Review Cycle:** Update as schema evolves
