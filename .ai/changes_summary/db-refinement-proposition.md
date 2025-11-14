# Database Schema Refinement Proposition

**Author:** Lead Backend Architect Review (Merged)  
**Date:** 2025-11-09 (Updated: 2025-11-10)  
**Schema Version:** 1.0  
**Status:** Proposed Changes (46 Issues Total)

---

## Executive Summary

This document outlines critical issues, data integrity concerns, performance optimizations, and security improvements for the Maraum MVP database schema. Issues are categorized by severity and include specific implementation suggestions.

**Tags:**
- **#double_trouble** - Issue confirmed by multiple reviews, higher confidence
- **#new** - Issue identified in secondary review

The document contains **46 total issues** across 6 categories:
- **7 Critical Issues** (including 3 #double_trouble, 2 #new)
- **10 Data Integrity Issues** (including 3 #double_trouble, 5 #new)
- **6 Performance Issues** (including 1 #double_trouble, 3 #new)
- **5 Security Issues** (3 #new)
- **6 Scalability Issues** (2 #new)
- **7 Design Issues** (including 2 #double_trouble, 3 #new)
- **5 Missing Features** (including 1 #double_trouble, 1 #new)

---

## Critical Issues

### 1. Missing Automatic `completed_at` Timestamp **#double_trouble**

**Issue:** The `completed_at` timestamp is not automatically set when `is_completed` changes to `true`, creating data integrity risk. The `calculate_session_duration()` trigger depends on `completed_at` being set but doesn't enforce it. Currently relies on client-side to set `completed_at`, which is fragile.

**Suggestion:** In the `calculate_session_duration()` trigger, default `NEW.completed_at := coalesce(NEW.completed_at, NOW())` when flipping to completed, then compute duration. Add a CHECK constraint to enforce the invariant:
```sql
CHECK ((is_completed AND completed_at IS NOT NULL) OR (NOT is_completed AND completed_at IS NULL))
```

**Impact:** HIGH - Could result in NULL `completed_at` for completed sessions and incorrect duration calculations.

---

### 2. Misaligned Weekly Reset Logic **#double_trouble**

**Issue:** The `profiles` table has misaligned weekly reset logic. Users register at arbitrary times with `week_reset_date = NOW() + 7 days`, but `reset_weekly_limits()` expects Monday resets. This creates inconsistent reset schedules per user. Additionally, the reset function increments by exactly 7 days, which can fall behind if a scheduled job is skipped or delayed, causing permanent drift.

**Suggestion:** Set `week_reset_date` to the next Monday at 00:00 UTC during profile creation. Update `reset_weekly_limits()` to calculate the next boundary in one step rather than incrementing:
```sql
SET week_reset_date = date_trunc('week', NOW() AT TIME ZONE 'UTC') + INTERVAL '7 days'
```
This ensures the function is idempotent and recovers from missed runs.

**Impact:** HIGH - Users will have different reset days, making the "weekly limit" feature confusing. Skipped jobs cause permanent misalignment.

---

### 3. No Protection Against Messages in Completed Sessions **#double_trouble**

**Issue:** No database constraint prevents inserting messages into completed sessions, allowing data corruption where users could continue conversations after completion. Additionally, there's no protection against concurrent completion toggling that could cause race conditions.

**Suggestion:** Add a CHECK constraint or trigger on `messages` table that prevents INSERT when the associated session has `is_completed = true`. Consider adding a partial unique index to prevent multiple concurrent completions if relevant to the business logic.

**Impact:** HIGH - Business logic violation that could corrupt completion statistics and user experience.

---

### 4. Streaming vs Immutability Contradiction **#new**

**Issue:** The schema documentation claims messages are "immutable once created" and has no UPDATE policies, yet also mentions "supports incremental saves during character-by-character streaming." These requirements are contradictory - streaming requires updates, immutability forbids them.

**Suggestion:** Choose one approach:
- **Option A (Streaming with updates):** Add `is_final BOOLEAN DEFAULT false` to messages, allow service-role-only UPDATE policy for streaming, and only count/display messages where `is_final = true`
- **Option B (True immutability with chunks):** Create a `message_chunks` table keyed by `message_id` for streaming fragments, with a compaction job that merges chunks into final messages

**Impact:** HIGH - Fundamental design decision affecting both data integrity and feature implementation.

---

### 5. Redundant Timestamp Columns in Sessions

**Issue:** The `sessions` table has redundant timestamp columns (`created_at` and `started_at` always have identical values).

**Suggestion:** Remove `created_at` column from sessions table and use `started_at` exclusively. Update all references and triggers accordingly.

**Impact:** MEDIUM - Code smell, increases confusion and storage without value.

---

### 6. Missing Extensions Dependency Declaration **#new**

**Issue:** The schema uses `gen_random_uuid()` function but doesn't explicitly declare the `pgcrypto` extension dependency, which could cause deployment failures in fresh environments.

**Suggestion:** Add at the top of the migration:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Impact:** HIGH - Could break initial deployments or environment clones.

---

### 7. Redundant Timestamp Columns in Messages **#double_trouble**

**Issue:** The `messages` table has redundant timestamp columns (`timestamp` and `created_at` serve the same purpose), creating ambiguity. This inconsistent naming (using `timestamp` instead of `created_at`) also contributes to inconsistent timestamp naming across tables.

**Suggestion:** Remove one column and standardize on `created_at` for consistency with other tables, or use `sent_at` to clarify the semantic purpose. Document timestamp naming conventions across all tables (prefer: `created_at`, `updated_at`, `completed_at`, `started_at`, `sent_at`).

**Impact:** MEDIUM - Code smell, increases confusion and storage without value. Part of broader naming inconsistency issue.

---

## Data Integrity Issues

### 8. Missing Temporal Validation in Sessions **#double_trouble**

**Issue:** Missing CHECK constraint ensuring `completed_at >= started_at` in the `sessions` table, allowing logically impossible data. Also missing constraints to ensure `message_count_main >= 0` and `message_count_helper >= 0`.

**Suggestion:** Add constraints:
```sql
ALTER TABLE sessions ADD CONSTRAINT sessions_completed_after_started 
CHECK (completed_at IS NULL OR completed_at >= started_at);

ALTER TABLE sessions ADD CONSTRAINT sessions_message_counts_non_negative
CHECK (message_count_main >= 0 AND message_count_helper >= 0);
```

**Impact:** MEDIUM - Allows invalid data that could break reporting and analytics.

---

### 9. Denormalized Scenario Count Can Drift **#double_trouble**

**Issue:** `profiles.completed_scenario_count` is denormalized data that can become out of sync if sessions are deleted manually or through cascades.

**Suggestion:** Either remove and calculate dynamically:
```sql
SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND is_completed = true
```
Or maintain via triggers on `sessions` when a session completes (increment only once, never decrement). Alternatively, use a materialized view for performance if needed.

**Impact:** MEDIUM - Data integrity risk, especially with manual database operations or cascading deletes.

---

### 10. Weekly Completion Count Can Drift **#double_trouble**

**Issue:** `profiles.current_week_completion_count` can become out of sync if completed sessions are deleted or if `is_completed` is toggled.

**Suggestion:** Add triggers on `sessions` UPDATE/DELETE that recalculate the count. Ensure the trigger only increments once when a session first becomes completed (track state transition, not just final state). Alternatively, compute dynamically in queries rather than storing.

**Impact:** MEDIUM - Could allow users to exceed weekly limits or be incorrectly blocked.

---

### 11. Silent Failure in Message Count Trigger **#double_trouble**

**Issue:** The `increment_message_count()` trigger silently does nothing if `chat_type` is invalid (not 'main' or 'helper'), masking data quality issues. Additionally, if streaming is implemented via `is_final` flag, this trigger will overcount by incrementing on every insert instead of only final messages.

**Suggestion:** Add to the trigger function:
```sql
ELSE 
    RAISE EXCEPTION 'Invalid chat_type: %', NEW.chat_type;
END IF;
```
If adopting `is_final` for streaming, modify trigger to only increment when `is_final = true`.

**Impact:** LOW - Defense in depth against application bugs. MEDIUM if streaming causes overcount.

---

### 12. No Validation for Session Duration

**Issue:** No constraint preventing negative `duration_seconds` in sessions table (could happen if timestamps are manipulated).

**Suggestion:** Add to sessions table:
```sql
ALTER TABLE sessions ADD CONSTRAINT sessions_duration_non_negative
CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
```

**Impact:** LOW - Edge case protection.

---

### 13. Messages Use Free-Text Enums **#new**

**Issue:** The `messages.role` and `messages.chat_type` columns use TEXT with CHECK constraints instead of proper PostgreSQL ENUMs or lookup tables. This prevents referential integrity at the type level and results in less efficient query plans.

**Suggestion:** Convert to proper ENUMs:
```sql
CREATE TYPE message_role AS ENUM ('user', 'scenario', 'helper');
CREATE TYPE chat_type AS ENUM ('main', 'helper');
ALTER TABLE messages ALTER COLUMN role TYPE message_role USING role::message_role;
ALTER TABLE messages ALTER COLUMN chat_type TYPE chat_type USING chat_type::chat_type;
```

**Impact:** MEDIUM - Better type safety, query performance, and maintainability.

---

### 14. Cross-Field Constraints Missing on Messages **#new**

**Issue:** No CHECK constraints enforce valid combinations of `role` and `chat_type`. Currently allows invalid combinations like `role='scenario' AND chat_type='helper'` or `role='helper' AND chat_type='main'`.

**Suggestion:** Add constraint ensuring valid combinations:
```sql
ALTER TABLE messages ADD CONSTRAINT messages_role_chat_type_valid
CHECK (
  (role = 'scenario' AND chat_type = 'main') OR
  (role = 'helper' AND chat_type = 'helper') OR
  (role = 'user' AND chat_type IN ('main', 'helper'))
);
```

**Impact:** MEDIUM - Prevents data corruption from invalid role/chat_type combinations.

---

### 15. No Hard Content Size Limits on Messages **#new**

**Issue:** No constraint caps the size of `messages.content`, allowing malicious users or application bugs to insert extremely large payloads, leading to storage bloat and increased API costs.

**Suggestion:** Add a reasonable size limit:
```sql
ALTER TABLE messages ADD CONSTRAINT messages_content_size_limit
CHECK (char_length(content) <= 8000);
```
Adjust the limit based on your specific use case. Consider application-level truncation for logs.

**Impact:** MEDIUM - Security/DoS vulnerability and cost control.

---

### 16. Scenarios Emoji Unconstrained **#new**

**Issue:** The `scenarios.emoji` column is TEXT without any size constraint, allowing arbitrary large payloads despite emojis being small by nature.

**Suggestion:** Add a size constraint:
```sql
ALTER TABLE scenarios ADD CONSTRAINT scenarios_emoji_size_limit
CHECK (octet_length(emoji) <= 16);
```

**Impact:** LOW - Edge case, but prevents abuse.

---

### 17. Scenarios Lacks Business Uniqueness on Title **#new**

**Issue:** No UNIQUE constraint on `scenarios.title`, allowing accidental duplicates during admin edits or seed data modifications.

**Suggestion:** Add constraint:
```sql
ALTER TABLE scenarios ADD CONSTRAINT scenarios_title_unique UNIQUE (title);
```

**Impact:** LOW - Prevents admin confusion and ensures referential clarity.

---

## Performance Issues

### 18. Inefficient RLS on Messages Table

**Issue:** The RLS policies on `messages` table use `EXISTS` subqueries that join to `sessions` on every row check. For a table expecting ~100 messages per session, this causes N+1-style query patterns.

**Suggestion:** Consider denormalizing `user_id` into the messages table for better RLS performance:
- Add `user_id UUID NOT NULL` to messages
- Populate via trigger from sessions
- Update RLS to simple `USING (auth.uid() = user_id)`

**Impact:** HIGH - RLS performance degrades with message volume; this optimization is critical for scale.

---

### 19. Missing Session Log Index

**Issue:** Missing composite index on `logs(session_id, created_at DESC)` for session-specific log queries, which will be slow.

**Suggestion:** Add:
```sql
CREATE INDEX idx_logs_session 
ON logs(session_id, created_at DESC) 
WHERE session_id IS NOT NULL;
```

**Impact:** MEDIUM - Log queries will be slow without this index.

---

### 20. Missing Scenario History Index **#double_trouble**

**Issue:** The `idx_sessions_history` index filters on `is_completed = true` but queries might also filter by `scenario_id` (e.g., "show all completed Marketplace scenarios"), requiring full index scan. Additional composite indexes needed for common query patterns.

**Suggestion:** Add multiple indexes for different query patterns:
```sql
CREATE INDEX idx_sessions_scenario_history 
ON sessions(user_id, scenario_id, completed_at DESC) 
WHERE is_completed = true;

CREATE INDEX idx_sessions_user_scenario 
ON sessions(user_id, scenario_id, is_completed);
```

**Impact:** MEDIUM - Scenario-specific history and analytics queries will be slow.

---

### 21. Pagination Stability for Messages Not Guaranteed **#new**

**Issue:** Current index on `messages(session_id, timestamp)` doesn't guarantee deterministic ordering for pagination if multiple messages have identical timestamps, leading to potential skipped or duplicate messages during pagination.

**Suggestion:** Add `id` to the index for stable keyset pagination:
```sql
CREATE INDEX idx_messages_session_time_id 
ON messages(session_id, timestamp, id);
```

**Impact:** MEDIUM - Pagination bugs under high-frequency message insertion.

---

### 22. Hot Row Updates on Sessions from Message Counts **#new**

**Issue:** The `increment_message_count()` trigger updates session row on every message insert, causing lock contention under high load (especially during streaming scenarios with many rapid inserts).

**Suggestion:** Consider batching or debouncing count updates (e.g., increment only on finalized messages), or periodically recompute from `messages` table for accuracy. Alternatively, accept eventual consistency and update counts less frequently.

**Impact:** MEDIUM - Performance degradation under concurrent message writes to the same session.

---

### 23. Missing GIN Index for JSONB Logs Metadata **#new**

**Issue:** If application plans to query logs by filtering on `metadata` JSONB fields (e.g., finding all logs with specific error codes), sequential scans will be extremely slow.

**Suggestion:** Add GIN index if metadata queries are anticipated:
```sql
CREATE INDEX idx_logs_metadata ON logs USING GIN (metadata);
```

**Impact:** LOW - Only needed if metadata queries are performed. High impact if they are.

---

## Security Issues

### 24. Unclear Logs RLS Policy

**Issue:** The `logs` table allows authenticated users to read their own logs via RLS policy, but there's no policy to allow service role to INSERT. The comment says "INSERT via service role only" but RLS will block this unless using service role key with RLS bypass.

**Suggestion:** Explicitly document that service role bypasses RLS, or add a policy:
```sql
CREATE POLICY logs_insert_service 
ON logs FOR INSERT 
TO authenticated 
WITH CHECK (false);
```
And rely on service role key bypass, or use `SECURITY DEFINER` functions for logging.

**Impact:** MEDIUM - Confusion about logging implementation; could cause runtime errors.

---

### 25. No Email Validation in Profile Creation

**Issue:** The `create_profile_for_new_user()` function has `SECURITY DEFINER` but doesn't validate that `NEW.email` is not null or empty, potentially creating invalid profiles.

**Suggestion:** Add validation:
```sql
IF NEW.email IS NULL OR NEW.email = '' THEN 
    RAISE EXCEPTION 'Email cannot be empty'; 
END IF;
```

**Impact:** LOW - Supabase Auth should prevent this, but defense in depth is valuable.

---

### 26. SECURITY DEFINER Functions Don't Lock search_path **#new**

**Issue:** All `SECURITY DEFINER` functions lack explicit `search_path` configuration, creating a security vulnerability where a malicious user could hijack the search path in multi-tenant or compromised sessions.

**Suggestion:** Add to all SECURITY DEFINER functions:
```sql
CREATE OR REPLACE FUNCTION function_name()
...
SECURITY DEFINER
SET search_path = public, pg_temp
...
```

**Impact:** HIGH - Security vulnerability allowing privilege escalation in certain scenarios.

---

### 27. RLS Allows INSERT on Profiles Despite Automatic Creation **#new**

**Issue:** The profiles table has an INSERT policy allowing users to create their own profiles, but profiles should only be created via the `create_profile_for_new_user()` trigger. This dual mechanism could create duplicate or inconsistent profiles.

**Suggestion:** Remove the user-facing INSERT policy for profiles and rely exclusively on the auth trigger:
```sql
DROP POLICY profiles_insert_own ON profiles;
```
Keep only SELECT/UPDATE policies limited to user's own profile.

**Impact:** MEDIUM - Could allow manual profile creation bypassing business logic.

---

### 28. Anonymous SELECT on Scenarios May Leak Content **#new**

**Issue:** The scenarios table allows anonymous SELECT access to all columns, potentially exposing full scenario content (system prompts, conversation flow details) to unauthenticated users when only basic info like title/emoji might be needed publicly.

**Suggestion:** If only basic info should be public, create a restricted view:
```sql
CREATE VIEW public_scenarios AS 
SELECT id, title, emoji, difficulty FROM scenarios;

GRANT SELECT ON public_scenarios TO anon;
REVOKE SELECT ON scenarios FROM anon;
GRANT SELECT ON scenarios TO authenticated;
```

**Impact:** LOW-MEDIUM - Depends on sensitivity of scenario content.

---

## Scalability Issues

### 29. Hardcoded Event Type Enum

**Issue:** The `logs.event_type` CHECK constraint contains a hardcoded enum list with 20+ values that will be painful to update (requires schema migration for each new event type).

**Suggestion:** Either:
- Remove the CHECK constraint and validate event types in application layer, OR
- Create a separate `event_types` reference table and use a foreign key

**Impact:** MEDIUM - Maintenance burden; slows development velocity.

---

### 30. No Logs Table Partitioning

**Issue:** No partitioning strategy for the `logs` table, which could grow very large (especially with `api_call_started` events). Even with 30-day retention, high-traffic apps could have millions of rows.

**Suggestion:** Implement table partitioning by month:
```sql
CREATE TABLE logs_YYYYMM PARTITION OF logs 
FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM-31');
```
This makes the 30-day cleanup near-instant (just drop old partitions).

**Impact:** HIGH - Future scalability; cleanup operations will degrade performance over time.

---

### 31. Bulk Update Risk in Weekly Reset

**Issue:** The `reset_weekly_limits()` function updates all eligible rows in a single transaction, which could lock the entire `profiles` table during weekly resets if user base grows large.

**Suggestion:** Add batching with `LIMIT` and loop, or accept per-user lazy evaluation (check and reset on first scenario start after reset date).

**Impact:** MEDIUM - Could cause Monday morning performance issues at scale.

---

### 32. Session Cleanup Not Fully Idempotent **#new**

**Issue:** The `delete_expired_sessions()` and `reset_weekly_limits()` functions don't enrich observability with time window boundaries or job metadata, making debugging and monitoring difficult. Additionally, they aren't truly idempotent if big gaps occur.

**Suggestion:** Enhance functions to compute target state explicitly (related to Issue #2) and log comprehensive metadata:
```sql
INSERT INTO logs (level, event_type, message, metadata)
VALUES ('info', 'cleanup_completed', 'Deleted expired sessions', 
  jsonb_build_object(
    'job_id', gen_random_uuid(),
    'deleted_count', deleted_count,
    'min_timestamp', min_ts,
    'max_timestamp', max_ts
  )
);
```
Return detailed results for metrics collection.

**Impact:** MEDIUM - Operational visibility and debugging capability.

---

### 33. No Archiving/Retention Plan for Messages **#new**

**Issue:** No defined long-term retention or archiving strategy for the `messages` table, which could grow very large. Old messages might need archiving to cold storage or compression to summaries for cost optimization.

**Suggestion:** Define retention policy (e.g., archive messages older than N months to cold storage, or compress to summaries). Add stub archival function now for future consistency:
```sql
CREATE OR REPLACE FUNCTION archive_old_messages(cutoff_months INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
  -- Future implementation: move old messages to archive table or cold storage
  RETURN 0;
$$ LANGUAGE plpgsql;
```

**Impact:** LOW - Not urgent for MVP, but prevents future ad-hoc solutions.

---

## Design Issues

### 34. Fragile Scenario ID Management

**Issue:** The `scenarios` table uses `INTEGER PRIMARY KEY` manually assigned (1, 2, 3) instead of auto-incrementing, making it fragile to insert order and requiring manual ID coordination.

**Suggestion:** Either:
- Use `SERIAL PRIMARY KEY` (auto-incrementing), OR
- If IDs must be stable, add a `UNIQUE` constraint on a `code` field (e.g., 'marketplace', 'party', 'kebab') and use that for references

**Impact:** LOW - Development friction; could cause ID conflicts in seed data.

---

### 35. No Soft Delete Pattern **#double_trouble**

**Issue:** No soft-delete pattern for user accounts or messages. When a user is deleted from `auth.users`, their profile cascades delete, and all `sessions`/`messages` cascade delete, losing all historical data. Similarly, messages are marked "immutable" but have no soft-delete mechanism for GDPR compliance.

**Suggestion:** Add soft delete support:
- **Profiles:** Add `deleted_at TIMESTAMPTZ NULL`, update RLS to filter `WHERE deleted_at IS NULL`
- **Messages:** Add `deleted_at TIMESTAMPTZ NULL` and `deleted_reason TEXT NULL` to handle GDPR requests without actual deletion

Alternatively, implement a BEFORE UPDATE/DELETE trigger on messages that raises an exception to enforce true immutability (except for soft-delete columns).

**Impact:** HIGH - Legal/compliance risk (GDPR, CCPA). Lose valuable analytics data.

---

### 36. Confusing Message Role Naming

**Issue:** The `messages.role` enum has 'scenario' and 'helper' but semantically 'scenario' is also AI-generated. The naming is confusing (role vs. chat_type overlap).

**Suggestion:** Rename to clarify intent:
- `role IN ('user', 'assistant')` and rely on `chat_type` to distinguish which assistant, OR
- Use `role IN ('user', 'main_assistant', 'helper_assistant')`

**Impact:** LOW - Code clarity; reduces onboarding friction for new developers.

---

### 37. Messages Immutability Not Enforced **#double_trouble**

**Issue:** Messages are documented as "immutable once created" but there's no database-level enforcement (trigger or constraint). Currently relies only on RLS permissions which could be bypassed.

**Suggestion:** Add a BEFORE UPDATE trigger that enforces immutability:
```sql
CREATE OR REPLACE FUNCTION prevent_message_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow updates to soft-delete columns if implemented
  IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Messages are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_immutable
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION prevent_message_updates();
```

**Impact:** MEDIUM - Data integrity; ensures documented immutability guarantee.

---

### 38. Scenarios Missing updated_at and Display Order **#new**

**Issue:** The `scenarios` table lacks `updated_at` timestamp (inconsistent with other tables) and has no explicit display ordering field, relying on implicit ID ordering.

**Suggestion:** Add both fields:
```sql
ALTER TABLE scenarios 
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN sort_order SMALLINT NOT NULL DEFAULT 0;

-- Attach existing update trigger
CREATE TRIGGER update_scenarios_updated_at
BEFORE UPDATE ON scenarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Impact:** LOW - Consistency and future flexibility for scenario management.

---

### 39. Inconsistent Timestamp Naming Across Tables **#new**

**Issue:** Timestamp column naming is inconsistent across tables: `started_at`, `created_at`, `timestamp`, `completed_at`, making the schema harder to understand and query.

**Suggestion:** Standardize naming conventions across all tables:
- Use `created_at` for row creation timestamp
- Use `updated_at` for last modification
- Use specific semantic names for business events: `started_at`, `completed_at`, `sent_at`
- Document conventions in a schema style guide

**Impact:** LOW - Code clarity and maintainability for future developers.

---

### 40. No Foreign-Key ON UPDATE Behavior Defined **#new**

**Issue:** Foreign key constraints don't explicitly define `ON UPDATE` behavior. While rare with UUIDs, being explicit prevents unexpected behavior.

**Suggestion:** Add explicit `ON UPDATE` clauses to all foreign keys:
```sql
FOREIGN KEY (user_id) REFERENCES profiles(id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE
```

**Impact:** LOW - Defensive programming; documents intent explicitly.

---

## Missing Features

### 41. Missing Scenario ID Index

**Issue:** No index on `sessions.scenario_id` despite being a foreign key that will be frequently queried (e.g., "how many users completed scenario 1?").

**Suggestion:** Add:
```sql
CREATE INDEX idx_sessions_scenario 
ON sessions(scenario_id, is_completed);
```

**Impact:** MEDIUM - Analytics queries will be slow.

---

### 42. Duplicate Source of Truth for Email **#double_trouble**

**Issue:** Email is stored in both `auth.users` and `profiles.email` with only a non-unique index, creating duplicate source of truth. No constraint ensures consistency or uniqueness at the database level.

**Suggestion:** Choose one approach:
- **Option A (Remove):** Remove `profiles.email` entirely and join `auth.users` when needed
- **Option B (Make authoritative):** Use `CITEXT` type for case-insensitive handling, add UNIQUE constraint, and create a trigger on `auth.users` to sync email changes:
```sql
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE profiles ALTER COLUMN email TYPE CITEXT;
CREATE UNIQUE INDEX uniq_profiles_email ON profiles(email);
```
- **Option C (Document):** Document that uniqueness is enforced by Supabase Auth layer only and profiles.email is cache only

**Impact:** MEDIUM - Data integrity risk if emails can get out of sync or duplicate.

---

### 43. No Rate Limiting Protection

**Issue:** No rate limiting or constraint preventing a malicious user from creating thousands of messages in rapid succession (either via API spam or application bug).

**Suggestion:** Add application-layer rate limiting, or add a database-level check: store `last_message_at` in sessions and enforce minimum time between messages via trigger.

**Impact:** MEDIUM - Security/DoS vulnerability.

---

### 44. No Migration Versioning Strategy

**Issue:** The schema has no versioning or migration tracking beyond filename. If multiple developers create migrations concurrently, conflicts are likely.

**Suggestion:** This is typically handled by migration tools (Supabase handles this), but document the migration strategy and ensure team coordinates on migration order.

**Impact:** LOW - Supabase handles this, but team process should be documented.

---

### 45. No Error Monitoring for Cleanup Functions

**Issue:** No monitoring or alerting hooks for when cleanup functions fail. If `delete_expired_sessions()` throws an error, it silently fails.

**Suggestion:** Wrap cleanup functions in exception handlers that log to `logs` table with level='error', and set up external monitoring to alert on error-level logs.

**Impact:** MEDIUM - Silent failures could lead to data bloat and storage issues.

---

### 46. No Idempotency Key for Message Writes **#new**

**Issue:** No mechanism to de-duplicate message writes during network retries or client-side errors, potentially creating duplicate messages if requests are retried.

**Suggestion:** Add optional idempotency key column:
```sql
ALTER TABLE messages 
  ADD COLUMN client_message_id UUID NULL;

CREATE UNIQUE INDEX idx_messages_idempotency 
  ON messages(session_id, client_message_id) 
  WHERE client_message_id IS NOT NULL;
```
Application can provide UUID on first attempt and safely retry with same ID.

**Impact:** MEDIUM - Better reliability and user experience during network issues.

---