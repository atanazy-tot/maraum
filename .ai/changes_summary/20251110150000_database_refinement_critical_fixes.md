# Database Refinement - Critical Fixes Migration

**Migration File:** `20251110150000_database_refinement_critical_fixes.sql`
**Created:** 2025-11-10 15:00:00 UTC
**Total Issues Addressed:** 27 out of 46 identified issues

---

## Executive Summary

This migration implements critical database schema improvements addressing data integrity, performance, security, and design issues identified in the database review. The changes are backward compatible where possible, with clear documentation of breaking changes.

**Key Decision:** Messages are kept truly immutable (no updates allowed). Streaming effects will be handled on the UI side, not at the database level. This simplifies the design since the MVP app isn't running yet.

**Priority:** HIGH - Critical fixes that prevent data corruption and improve system reliability

---

## Changes by Category

### 🔴 Critical Issues Fixed (7 issues)

#### 1. Issue #6: Missing Extensions Dependency
- **Added:** Explicit `CREATE EXTENSION IF NOT EXISTS pgcrypto`
- **Impact:** Prevents deployment failures in fresh environments

#### 2. Issue #1: Missing Automatic completed_at Timestamp
- **Added:** Auto-setting of `completed_at` when `is_completed` changes to `true`
- **Added:** CHECK constraint ensuring completed sessions have `completed_at`
- **Modified:** `calculate_session_duration()` trigger to use `coalesce()`
- **Impact:** Prevents NULL completed_at and incorrect duration calculations

#### 3. Issue #2: Misaligned Weekly Reset Logic
- **Fixed:** `week_reset_date` now set to next Monday at 00:00 UTC on profile creation
- **Fixed:** `reset_weekly_limits()` now idempotent using `date_trunc()` for Monday boundary
- **Modified:** `create_profile_for_new_user()` function
- **Impact:** Consistent Monday resets, recovers from missed scheduled jobs

#### 4. Issue #3: No Protection Against Messages in Completed Sessions
- **Added:** Trigger `check_session_not_completed` prevents message inserts in completed sessions
- **Added:** Function `prevent_messages_in_completed_sessions()`
- **Impact:** Enforces business logic, prevents data corruption

#### 5. Issue #4: Streaming vs Immutability Contradiction
- **Decision:** Chose true immutability (no database-level streaming support)
- **Rationale:** MVP app not running yet; streaming can be handled on UI side
- **Implementation:** Messages remain truly immutable (no updates allowed)
- **Impact:** Simplified design, cleaner data integrity, easier to reason about

#### 6. Issue #5: Redundant Timestamp in Sessions
- **Removed:** `created_at` column from sessions table
- **Migration:** Use `started_at` instead
- **Impact:** Eliminates confusion, reduces storage

#### 7. Issue #7: Redundant Timestamp in Messages
- **Renamed:** `timestamp` → `sent_at` for clarity
- **Updated:** All related indexes
- **Impact:** Consistent naming, improved code clarity

---

### 🟡 Data Integrity Issues Fixed (10 issues)

#### 8. Issue #8: Missing Temporal Validation
- **Added:** `CHECK (completed_at IS NULL OR completed_at >= started_at)`
- **Added:** `CHECK (message_count_main >= 0 AND message_count_helper >= 0)`
- **Impact:** Prevents logically impossible data

#### 9. Issue #9: Denormalized Scenario Count Can Drift
- **Added:** Trigger `maintain_profile_counts` on sessions INSERT/UPDATE/DELETE
- **Added:** Function `update_profile_completion_counts()`
- **Added:** Data verification query to fix existing counts
- **Impact:** Counts stay synchronized automatically

#### 10. Issue #10: Weekly Completion Count Can Drift
- **Fixed:** Same trigger as Issue #9 maintains weekly counts
- **Impact:** Prevents limit bypass or incorrect blocking

#### 11. Issue #11: Silent Failure in Message Count Trigger
- **Modified:** `increment_message_count()` now raises exception on invalid chat_type
- **Impact:** Defense against bugs, ensures data quality

#### 12. Issue #12: No Validation for Session Duration
- **Added:** `CHECK (duration_seconds IS NULL OR duration_seconds >= 0)`
- **Impact:** Edge case protection

#### 13. Issue #13: Messages Use Free-Text Enums
- **Created:** `message_role` ENUM type
- **Created:** `chat_type_enum` ENUM type
- **Migrated:** Existing data to new types
- **Impact:** Type safety, better query performance

#### 14. Issue #14: Cross-Field Constraints Missing
- **Added:** `messages_role_chat_type_valid` CHECK constraint
- **Validates:** scenario+main, helper+helper, user+both
- **Impact:** Prevents invalid role/chat_type combinations

#### 15. Issue #15: No Hard Content Size Limits
- **Added:** `CHECK (char_length(content) <= 8000)` on messages
- **Impact:** Security/DoS protection, cost control

#### 16. Issue #16: Scenarios Emoji Unconstrained
- **Added:** `CHECK (octet_length(emoji) <= 16)` on scenarios
- **Impact:** Prevents abuse

#### 17. Issue #17: Scenarios Lacks Business Uniqueness
- **Added:** UNIQUE constraint on `scenarios.title`
- **Impact:** Prevents duplicate scenarios

---

### 🔒 Security Issues Fixed (4 issues)

#### 18. Issue #25: No Email Validation in Profile Creation
- **Added:** Email validation in `create_profile_for_new_user()`
- **Raises:** Exception if email is NULL or empty
- **Impact:** Defense in depth

#### 19. Issue #26: SECURITY DEFINER Functions Don't Lock search_path
- **Modified:** All SECURITY DEFINER functions now have `SET search_path = public, pg_temp`
- **Functions:** create_profile_for_new_user, reset_weekly_limits, delete_expired_sessions, delete_old_logs
- **Impact:** Prevents privilege escalation attacks

#### 20. Issue #27: RLS Allows INSERT on Profiles
- **Removed:** `profiles_insert_own` policy
- **Rationale:** Profiles should only be created via auth trigger
- **Impact:** Enforces single creation path

#### 21. Issue #42: Enable Case-Insensitive Emails
- **Added:** CITEXT extension
- **Modified:** profiles.email type to CITEXT
- **Added:** UNIQUE constraint on email
- **Impact:** Email becomes authoritative source of truth

---

### ⚡ Performance Optimizations (6 issues)

#### 22. Issue #18: Inefficient RLS on Messages
- **Added:** `user_id UUID NOT NULL` to messages (denormalized)
- **Added:** Trigger `populate_user_id_on_insert` to auto-populate
- **Backfilled:** Existing messages with user_id from sessions
- **Modified:** RLS policies to use `auth.uid() = user_id` instead of EXISTS subquery
- **Impact:** Eliminates N+1 query patterns, massive RLS performance improvement

#### 23. Issue #19: Missing Session Log Index
- **Added:** `idx_logs_session ON logs(session_id, created_at DESC)`
- **Impact:** Fast session-specific log queries

#### 24. Issue #20: Missing Scenario History Index
- **Added:** `idx_sessions_scenario_history` for scenario-specific history
- **Added:** `idx_sessions_user_scenario` for analytics
- **Impact:** Fast scenario filtering in history queries

#### 25. Issue #21: Pagination Stability Not Guaranteed
- **Replaced:** `idx_messages_session_chronological` with `idx_messages_session_time_id`
- **Added:** `id` column to index for stable ordering
- **Impact:** Deterministic pagination, no skipped/duplicate messages

#### 26. Issue #41: Missing Scenario ID Index
- **Added:** `idx_sessions_scenario ON sessions(scenario_id, is_completed)`
- **Impact:** Fast analytics queries by scenario

#### 27. Issue #23: Missing GIN Index for JSONB
- **Added:** `idx_logs_metadata ON logs USING GIN (metadata)`
- **Impact:** Fast metadata queries on logs table

---

### 🎨 Design Improvements (4 issues)

#### 28. Issue #37: Messages Immutability Not Enforced
- **Added:** Trigger `messages_immutable` enforces true immutability at database level
- **Added:** Function `prevent_message_updates()`
- **Enforces:** NO updates allowed - all update attempts raise exception
- **Impact:** Database-level guarantee of complete immutability

#### 29. Issue #38: Scenarios Missing updated_at and Display Order
- **Added:** `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Added:** `sort_order SMALLINT NOT NULL DEFAULT 0`
- **Added:** Trigger for automatic updated_at maintenance
- **Set:** Initial sort_order values (1=marketplace, 2=party, 3=kebab)
- **Impact:** Consistency with other tables, explicit ordering control

#### 30. Issue #40: No Foreign-Key ON UPDATE Behavior Defined
- **Updated:** All foreign keys to include `ON UPDATE CASCADE` (or SET NULL for logs)
- **Tables:** sessions, messages, logs
- **Impact:** Explicit behavior documentation, prevents surprises

#### 31. Issue #46: No Idempotency Key for Message Writes
- **Added:** `client_message_id UUID` column to messages
- **Added:** Unique partial index for idempotency
- **Impact:** Safe message retries during network issues

---

### 🔧 Additional Enhancements

#### 32. Issue #32: Session Cleanup Not Fully Idempotent
- **Enhanced:** `delete_expired_sessions()` with comprehensive logging
- **Added:** Metadata tracking (job_id, timestamps, counts)
- **Impact:** Better observability and debugging

#### 33. Data Integrity Verification Queries
- **Added:** Backfill queries for completed_at, duration_seconds
- **Added:** Verification and fix for profile completion counts
- **Impact:** Cleans up any existing data issues

---

## Breaking Changes

### Application Code Updates Required

1. **Message Queries:**
   - Replace `messages.timestamp` with `messages.sent_at`
   - Update ORDER BY clauses accordingly

2. **Session Queries:**
   - Replace `sessions.created_at` with `sessions.started_at`
   - Remove references to created_at

3. **Message Role/Chat Type:**
   - Update code to handle ENUM types instead of TEXT
   - May need casting in some queries: `role::text`

4. **Streaming Implementation:**
   - Handle streaming entirely on UI side
   - Only insert messages when they are complete
   - Do NOT attempt to save partial/incomplete messages
   - Messages are immutable once inserted

5. **Idempotent Message Creation:**
   - Generate `client_message_id` UUID on client
   - Include in insert to enable safe retries

6. **Profile Creation:**
   - Remove any application-level profile INSERT code
   - Rely exclusively on auth trigger

---

## Testing Recommendations

### Critical Tests

1. **Session Completion Flow:**
   - Verify `completed_at` auto-sets when `is_completed = true`
   - Verify duration calculates correctly
   - Verify completion counts increment

2. **Message Insertion:**
   - Insert complete messages only
   - Verify message_count increments correctly
   - Verify user_id auto-populates from session

3. **Weekly Reset:**
   - Verify Monday boundary calculation
   - Test idempotency (run multiple times)
   - Verify correct reset behavior

4. **Message Immutability:**
   - Verify cannot update any field after creation
   - Verify all update attempts raise exception
   - Test with different column updates

5. **RLS Performance:**
   - Test message queries at scale
   - Verify no N+1 patterns in logs
   - Compare query plans before/after

### Edge Cases

1. **Completed Sessions:**
   - Verify cannot insert messages
   - Verify error message is clear

2. **Invalid Enum Values:**
   - Test that invalid role/chat_type rejected
   - Verify constraint violations clear

3. **Concurrent Completions:**
   - Test race conditions on session completion
   - Verify counts don't double-increment

---

## Rollback Plan

**Complexity:** HIGH - Migration includes type changes and data migrations

### Rollback Steps

1. **Backup database before applying** (critical!)

2. **To rollback:**
   - Would require creating reverse migration
   - ENUM type changes particularly complex
   - Denormalized user_id can be dropped safely
   - Timestamp renames can be reversed

3. **Alternative:** Restore from backup taken before migration

---

## Performance Impact

### Expected Improvements

- **Messages RLS:** 50-90% reduction in query time for message lookups
- **History Queries:** 60-80% faster with new indexes
- **Log Queries:** 70-90% faster with session-specific index

### Potential Concerns

- **Migration Time:** May take 1-5 minutes depending on data volume
- **Lock Time:** Brief table locks during constraint additions
- **Recommend:** Run during low-traffic window

---

## Remaining Issues (Not in This Migration)

The following 19 issues from the review are deferred to future migrations:

**Scalability (Issues #29-33):**
- Hardcoded event type enum
- Logs table partitioning
- Bulk update risk in weekly reset
- Message archiving/retention plan

**Design (Issues #34-36, #39):**
- Fragile scenario ID management
- No soft delete pattern
- Confusing message role naming
- Timestamp naming inconsistency

**Missing Features (Issues #43-45):**
- Rate limiting protection
- Migration versioning strategy
- Error monitoring for cleanup functions

**Security (Issues #24, #28):**
- Unclear logs RLS policy
- Anonymous SELECT on scenarios

**Performance (Issue #22):**
- Hot row updates on sessions

---

## Success Criteria

### Migration Success

- ✅ All DDL statements execute without errors
- ✅ All data migrations complete successfully
- ✅ All constraints validate existing data
- ✅ All triggers fire correctly on test operations
- ✅ All indexes created successfully

### Application Success

- ✅ No runtime errors after deployment
- ✅ Message queries use sent_at correctly
- ✅ Session queries use started_at correctly
- ✅ Messages only inserted when complete (no partial saves)
- ✅ Message immutability enforced (all updates fail)
- ✅ Weekly reset functions correctly

---

## Next Steps

1. **Review Migration:** Code review by at least one other developer
2. **Test in Staging:** Apply to staging environment first
3. **Verify Functionality:** Run full test suite
4. **Performance Testing:** Verify query improvements
5. **Update Application Code:** Implement breaking changes
6. **Deploy to Production:** During low-traffic window
7. **Monitor:** Watch for errors, performance issues
8. **Plan Phase 2:** Address remaining 19 issues

---

## Files Modified

- `supabase/migrations/20251110150000_database_refinement_critical_fixes.sql` (new)
- Application code will require updates for breaking changes

## Documentation Updated

- This summary document
- Migration includes comprehensive inline comments
- Post-migration notes at end of SQL file

---

**Migration Status:** ✅ Ready for Review
**Recommended Review Time:** 30-45 minutes
**Estimated Apply Time:** 2-5 minutes
**Risk Level:** Medium (includes type changes and data migrations)
