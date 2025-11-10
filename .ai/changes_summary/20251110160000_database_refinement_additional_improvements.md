# Database Refinement - Additional Improvements Migration

**Migration File:** `20251110160000_database_refinement_additional_improvements.sql`
**Created:** 2025-11-10 16:00:00 UTC
**Total Issues Addressed:** 6 issues (with 8 additional issues explicitly skipped for MVP)

---

## Executive Summary

This is the second migration in the database refinement series, implementing selected improvements after the critical fixes in migration 20251110150000. This migration focuses on security improvements (anonymous access restrictions), design clarity (role naming, auto-increment IDs), and operational reliability (error handling).

**Key Decisions:**
- Scenarios: Anonymous access restricted to public view only
- Auto-increment IDs for scenarios (easier maintenance)
- Message roles renamed for semantic clarity
- Comprehensive error handling for cleanup functions
- Timestamp naming standard documented

**Priority:** MEDIUM - Improvements that enhance security, clarity, and maintainability

---

## Changes by Category

### 🔒 Security Improvements (2 issues)

#### 1. Issue #28: Restrict Anonymous Access to Scenarios
- **Problem:** Anonymous users could see full scenario content including initial messages
- **Solution:** Created `public_scenarios` view with limited columns
- **Implementation:**
  - Created view exposing only: `id`, `title`, `emoji`, `sort_order`, `is_active`
  - Hidden from anonymous: `initial_message_main`, `initial_message_helper`, `created_at`, `updated_at`
  - Revoked direct table access from `anon` role
  - Granted SELECT on view to `anon` and `authenticated`
  - Authenticated users retain full access via RLS policies
- **Impact:** Prevents scenario content leakage to unauthenticated users

#### 2. Issue #24: Clarify Logs RLS Policy
- **Added:** Documentation comments on logs table and policy
- **Clarifies:** Service role bypasses RLS for inserts, users can read own logs
- **Impact:** Developer clarity, no functional change

---

### 🎨 Design Improvements (2 issues)

#### 3. Issue #34: Convert Scenario ID to SERIAL
- **Problem:** Manual ID management (1, 2, 3) fragile, requires coordination
- **Solution:** Converted to auto-increment with SERIAL sequence
- **Implementation:**
  - Created `scenarios_id_seq` sequence starting at 4
  - Attached sequence to `id` column with default
  - Existing scenarios (1, 2, 3) preserved
  - Future inserts auto-generate IDs: 4, 5, 6, etc.
  - Set sequence ownership for cascade deletion
- **Impact:** Easier scenario management, no ID conflicts
- **Breaking Change:** Don't specify ID on new scenario inserts

#### 4. Issue #36: Rename Message Roles for Clarity
- **Problem:** Role names confusing ('scenario' and 'helper' both AI, overlap with chat_type)
- **Solution:** Renamed to semantic values (Option B)
- **Mappings:**
  - `'scenario'` → `'main_assistant'` (AI in 魔 main chat)
  - `'helper'` → `'helper_assistant'` (AI in 間 helper chat)
  - `'user'` → `'user'` (unchanged)
- **Implementation:**
  - Created new `message_role_new` enum
  - Migrated all existing data
  - Dropped old enum and column
  - Renamed new type to `message_role`
  - Updated cross-field constraint
- **Impact:** Clearer semantic meaning, easier onboarding
- **Breaking Change:** Update application code to use new role values

---

### 🔧 Operational Improvements (1 issue)

#### 5. Issue #45: Add Error Handling to Cleanup Functions
- **Problem:** Cleanup function failures silent, no monitoring
- **Solution:** Wrapped functions in exception handlers with logging
- **Implementation:**
  - Enhanced `delete_expired_sessions()` with try/catch
  - Enhanced `delete_old_logs()` with try/catch
  - Enhanced `reset_weekly_limits()` with try/catch
  - Errors logged to `logs` table with `level='error'`
  - Error metadata includes: `error_message`, `error_detail`, `status='failed'`
  - Successful runs log with `status='success'`
  - Exceptions re-raised for external monitoring
- **Impact:** Operational visibility, easier debugging, proactive error detection

---

### 📚 Documentation Improvements (1 issue)

#### 6. Issue #39: Timestamp Naming Standard
- **Created:** Comprehensive naming standard document
- **Location:** `.ai/database-timestamp-naming-standard.md`
- **Contents:**
  - Standard column names: `created_at`, `updated_at`
  - Business event names: `started_at`, `completed_at`, `sent_at`, etc.
  - Current schema status assessment
  - Guidelines for new tables
  - Good/bad examples
  - Rationale and enforcement checklist
- **Impact:** Consistent timestamp naming across all future work

---

## Issues Explicitly Skipped for MVP

The following 8 issues were reviewed and consciously deferred:

**Performance:**
- ❌ Issue #22: Hot row updates on sessions (acceptable for MVP concurrency)

**Scalability:**
- ❌ Issue #29: Hardcoded event type enum (maintainable for MVP)
- ❌ Issue #30: Logs table partitioning (30-day retention sufficient)
- ❌ Issue #31: Bulk update risk in weekly reset (user base too small)
- ❌ Issue #33: Message archiving/retention plan (decide when needed)

**Design:**
- ❌ Issue #35: Soft delete pattern (add if GDPR required)

**Features:**
- ❌ Issue #43: Rate limiting protection (handle in application layer)
- ❌ Issue #44: Migration versioning strategy (Supabase handles this)

---

## Breaking Changes

### Application Code Updates Required

1. **Scenario Queries for Anonymous Users:**
   ```sql
   -- OLD (will fail for anon users after migration)
   SELECT * FROM scenarios;

   -- NEW (for anonymous users)
   SELECT * FROM public_scenarios;

   -- NEW (for authenticated users - both work)
   SELECT * FROM scenarios;  -- Full access via RLS
   SELECT * FROM public_scenarios;  -- Limited view
   ```

2. **Scenario Inserts:**
   ```sql
   -- OLD (manual ID)
   INSERT INTO scenarios (id, title, emoji, ...)
   VALUES (4, 'New Scenario', '🎯', ...);

   -- NEW (auto-generated ID)
   INSERT INTO scenarios (title, emoji, ...)
   VALUES ('New Scenario', '🎯', ...)
   RETURNING id;
   ```

3. **Message Role Handling:**
   ```typescript
   // OLD
   if (message.role === 'scenario') { ... }
   if (message.role === 'helper') { ... }

   // NEW
   if (message.role === 'main_assistant') { ... }
   if (message.role === 'helper_assistant') { ... }
   ```

4. **Cleanup Monitoring:**
   ```sql
   -- Monitor for cleanup failures
   SELECT * FROM logs
   WHERE event_type IN (
     'session_expiration_cleanup',
     'cleanup_job_executed',
     'weekly_limit_reset'
   )
   AND level = 'error'
   ORDER BY created_at DESC;
   ```

---

## Testing Recommendations

### Critical Tests

1. **Anonymous Access Restriction:**
   - Verify anonymous user can SELECT from `public_scenarios`
   - Verify anonymous user CANNOT SELECT from `scenarios` directly
   - Verify authenticated user can SELECT from both
   - Verify public_scenarios only shows safe columns
   - Verify only active scenarios appear in view

2. **Auto-Increment Scenarios:**
   - Insert new scenario without specifying ID
   - Verify ID auto-generates starting at 4
   - Verify existing scenarios (1, 2, 3) unchanged
   - Test sequence on multiple inserts (4, 5, 6...)

3. **Message Role Migration:**
   - Verify existing messages migrated correctly
   - Check 'scenario' → 'main_assistant'
   - Check 'helper' → 'helper_assistant'
   - Check 'user' → 'user'
   - Verify cross-field constraint still enforces valid combinations

4. **Error Handling:**
   - Force cleanup function error (e.g., permission issue)
   - Verify error logged to logs table with level='error'
   - Verify error metadata includes message and detail
   - Verify exception re-raised to caller

### Edge Cases

1. **View Access:**
   - Test query performance on public_scenarios vs scenarios
   - Verify view updates when scenarios.is_active changes

2. **Sequence Edge Cases:**
   - Test sequence after manual ID insert
   - Verify sequence doesn't conflict with existing IDs

3. **Role Constraint:**
   - Try inserting invalid role/chat_type combinations
   - Verify constraint prevents: main_assistant+helper, helper_assistant+main

---

## Rollback Plan

**Complexity:** HIGH - Multiple enum changes and sequence creation

### Rollback Steps

1. **Backup database before applying** (critical!)

2. **To rollback:**
   - Message role enum change is complex to reverse
   - Sequence can be dropped, but breaks new scenario inserts
   - View can be dropped safely
   - Error handling changes backward compatible

3. **Alternative:** Restore from backup taken before migration

4. **Partial rollback:**
   - Error handling: Can revert to old function versions
   - View: Drop `public_scenarios`, grant anon access to table
   - Sequence: Drop sequence, remove default from column
   - Role enum: Requires full data migration in reverse

---

## Performance Impact

### Expected Improvements

- **Anonymous Scenario Access:** No change (view vs table performance equivalent)
- **Scenario Inserts:** Minimal overhead from sequence lookup
- **Message Queries:** No performance change (enum still indexed)
- **Cleanup Functions:** Negligible overhead from exception handling

### Potential Concerns

- **Migration Time:** 1-3 minutes for enum type changes
- **Lock Time:** Brief locks during ALTER TABLE operations
- **Recommend:** Run during low-traffic window

---

## Integration with Previous Migration

This migration builds on `20251110150000_database_refinement_critical_fixes.sql`:

**Requires previous migration:**
- Depends on message table structure from first migration
- Uses timestamp naming established in first migration
- Builds on RLS policies from first migration

**Compatible with:**
- All changes in first migration
- No conflicts or dependencies

**Apply order:** MUST apply first migration before this one

---

## Documentation Updates

### New Files Created

1. **`.ai/database-timestamp-naming-standard.md`**
   - Comprehensive naming conventions
   - Examples and anti-patterns
   - Current schema assessment
   - Guidelines for future tables

### Files to Update

2. **Application Code:**
   - Update scenario query logic for anon users
   - Change message role references
   - Remove ID specification on scenario inserts
   - Add cleanup error monitoring

3. **API Documentation:**
   - Update scenario endpoint documentation
   - Document public_scenarios view schema
   - Update message role enum values

---

## Success Criteria

### Migration Success

- ✅ Sequence created and attached to scenarios.id
- ✅ Existing scenario IDs (1, 2, 3) preserved
- ✅ public_scenarios view created successfully
- ✅ Anonymous access revoked from scenarios table
- ✅ Message roles migrated without data loss
- ✅ All cross-field constraints validate
- ✅ Cleanup functions execute with error handling

### Application Success

- ✅ Anonymous users query public_scenarios successfully
- ✅ New scenario inserts auto-generate IDs
- ✅ Message role queries use new enum values
- ✅ Cleanup errors appear in logs table
- ✅ No runtime errors in production

---

## Monitoring Recommendations

### Logs to Monitor

1. **Cleanup Errors:**
   ```sql
   -- Daily check for cleanup failures
   SELECT created_at, event_type, metadata->>'error_message'
   FROM logs
   WHERE level = 'error'
   AND event_type IN (
     'session_expiration_cleanup',
     'cleanup_job_executed',
     'weekly_limit_reset'
   )
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Anonymous Access Patterns:**
   ```sql
   -- Monitor if anonymous users hitting access errors
   -- (implement application-level logging for this)
   ```

3. **Scenario Growth:**
   ```sql
   -- Track auto-increment sequence usage
   SELECT last_value FROM scenarios_id_seq;
   ```

---

## Future Considerations

### Phase 3 Enhancements (Not in This Migration)

**If needed later:**
1. **Soft Delete Pattern (Issue #35):**
   - Add `deleted_at` columns
   - Update RLS policies
   - Implement GDPR compliance

2. **Logs Partitioning (Issue #30):**
   - Implement monthly partitions
   - Faster cleanup operations

3. **Rate Limiting (Issue #43):**
   - Add database-level throttling
   - Complement application-layer limits

4. **Message Archiving (Issue #33):**
   - Cold storage for old messages
   - Cost optimization

---

## Next Steps

1. **Review Migration:** Code review by at least one other developer
2. **Review Documentation:** Read timestamp naming standard
3. **Test in Staging:** Apply both migrations in sequence
4. **Verify Functionality:** Run test suite
5. **Update Application Code:** Implement breaking changes
6. **Deploy to Production:** During low-traffic window
7. **Monitor Logs:** Watch for cleanup errors

---

## Files Modified

- `supabase/migrations/20251110160000_database_refinement_additional_improvements.sql` (new)
- `.ai/database-timestamp-naming-standard.md` (new)
- Application code will require updates for breaking changes

---

## Summary Statistics

**Issues Addressed:** 6
**Breaking Changes:** 3
**Security Improvements:** 2
**Design Improvements:** 2
**Operational Improvements:** 1
**Documentation Improvements:** 1
**Issues Deferred:** 8
**New Files:** 2

---

**Migration Status:** ✅ Ready for Review
**Recommended Review Time:** 20-30 minutes
**Estimated Apply Time:** 2-3 minutes
**Risk Level:** Medium (enum changes require careful testing)
