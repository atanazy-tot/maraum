# API Endpoint Implementation Plan: GET /api/sessions/:sessionId

## 1. Endpoint Overview

Retrieves a specific session by ID with its associated scenario information and optionally includes the complete message history. This endpoint is used when resuming an existing session, displaying session details, or reviewing past conversations.

**Key Features:**
- Fetches session metadata with embedded scenario details
- Optionally includes complete message history ordered chronologically
- Supports session restoration after browser refresh
- Returns denormalized data optimized for UI consumption

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/sessions/:sessionId`
- **Route File:** `src/pages/api/sessions/[sessionId].ts`
- **Authentication:** Not required (deferred to future implementation)

### Parameters

#### Required:
- **sessionId** (path parameter)
  - Type: UUID string
  - Location: URL path
  - Description: Unique identifier of the session to retrieve
  - Validation: Must be valid UUID v4 format
  - Example: `550e8400-e29b-41d4-a716-446655440000`

#### Optional:
- **include_messages** (query parameter)
  - Type: Boolean
  - Location: URL query string
  - Default: `true`
  - Description: Whether to include message history in response
  - Valid values: `true`, `false`, `1`, `0`, `"true"`, `"false"`
  - Example: `/api/sessions/550e8400-e29b-41d4-a716-446655440000?include_messages=false`

### Request Body
None (GET request)

## 3. Used Types

### From `src/types.ts`:

**Response DTOs:**
```typescript
// Main response type
SessionDTO = Omit<Tables<"sessions">, "updated_at"> & {
  scenario: ScenarioEmbedDTO;
  messages?: MessageDTO[];
}

// Embedded scenario information
ScenarioEmbedDTO = Pick<Tables<"scenarios">, "id" | "title" | "emoji">

// Message structure (when include_messages=true)
MessageDTO = Pick<Tables<"messages">, "id" | "role" | "chat_type" | "content" | "sent_at">

// Error response
ApiErrorDTO = {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
```

**Database Types:**
```typescript
// From src/db/database.types.ts
Tables<"sessions"> - Full session table structure
Tables<"scenarios"> - Full scenario table structure
Tables<"messages"> - Full message table structure
```

## 4. Response Details

### Success Response (200 OK)

**Content-Type:** `application/json`

**Body Structure:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": null,
  "scenario_id": 1,
  "scenario": {
    "id": 1,
    "title": "Marketplace Encounter",
    "emoji": "🛒"
  },
  "is_completed": false,
  "started_at": "2024-11-08T10:00:00Z",
  "last_activity_at": "2024-11-08T10:25:00Z",
  "completed_at": null,
  "message_count_main": 22,
  "message_count_helper": 5,
  "duration_seconds": null,
  "messages": [
    {
      "id": "msg-uuid-1",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Du stehst auf einem belebten Wochenmarkt...",
      "sent_at": "2024-11-08T10:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "role": "helper_assistant",
      "chat_type": "helper",
      "content": "Ah, you're attempting German. How ambitious...",
      "sent_at": "2024-11-08T10:00:00Z"
    }
  ]
}
```

**Field Notes:**
- `user_id` is always `null` in MVP (no authentication)
- `updated_at` is omitted from response (internal audit field)
- `messages` array is present when `include_messages=true`, otherwise omitted entirely (not empty array)
- Messages ordered by `sent_at ASC` (chronological order)
- All timestamps in ISO 8601 format with timezone

### Error Responses

#### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "That's not even a valid session ID. Did you just make that up?",
  "details": {
    "field": "sessionId",
    "issue": "Invalid UUID format"
  }
}
```

**Triggers:**
- Invalid UUID format in path parameter
- Invalid boolean value in query parameter that cannot be coerced

#### 404 Not Found
```json
{
  "error": "not_found",
  "message": "I've looked everywhere, and this session simply doesn't exist. Perhaps it never did.",
  "details": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Triggers:**
- Session ID doesn't exist in database
- Session was deleted or expired

#### 500 Internal Server Error
```json
{
  "error": "database_error",
  "message": "The database is having an existential crisis. Try again in a moment.",
  "details": {
    "operation": "fetch_session"
  }
}
```

**Triggers:**
- Database connection failure
- Query execution error
- Unexpected database exception

## 5. Data Flow

### Request Processing Flow:

```
1. Request arrives at /api/sessions/:sessionId
   ↓
2. Middleware injects Supabase client into context.locals
   ↓
3. Route handler (GET function) extracts parameters
   ↓
4. Input validation with Zod schemas
   ↓
5. Call SessionService.getSessionById(supabase, sessionId, includeMessages)
   ↓
6. Service executes database query:
   a. SELECT from sessions table
   b. LEFT JOIN with scenarios table
   c. Conditionally LEFT JOIN with messages table (if includeMessages=true)
   d. Apply WHERE clause (session.id = sessionId)
   e. Order messages by sent_at ASC
   ↓
7. Transform database result to SessionDTO format
   ↓
8. Return 200 OK with SessionDTO
```

### Database Query Pattern:

**When include_messages=true:**
```sql
SELECT 
  sessions.id,
  sessions.user_id,
  sessions.scenario_id,
  sessions.is_completed,
  sessions.started_at,
  sessions.last_activity_at,
  sessions.completed_at,
  sessions.message_count_main,
  sessions.message_count_helper,
  sessions.duration_seconds,
  scenarios.id as scenario_id,
  scenarios.title as scenario_title,
  scenarios.emoji as scenario_emoji,
  messages.id as message_id,
  messages.role as message_role,
  messages.chat_type as message_chat_type,
  messages.content as message_content,
  messages.sent_at as message_sent_at
FROM sessions
LEFT JOIN scenarios ON sessions.scenario_id = scenarios.id
LEFT JOIN messages ON messages.session_id = sessions.id
WHERE sessions.id = $1
ORDER BY messages.sent_at ASC;
```

**When include_messages=false:**
```sql
SELECT 
  sessions.id,
  sessions.user_id,
  sessions.scenario_id,
  sessions.is_completed,
  sessions.started_at,
  sessions.last_activity_at,
  sessions.completed_at,
  sessions.message_count_main,
  sessions.message_count_helper,
  sessions.duration_seconds,
  scenarios.id as scenario_id,
  scenarios.title as scenario_title,
  scenarios.emoji as scenario_emoji
FROM sessions
LEFT JOIN scenarios ON sessions.scenario_id = scenarios.id
WHERE sessions.id = $1;
```

### Service Layer (SessionService):

The service should expose:
```typescript
async function getSessionById(
  supabase: SupabaseClient,
  sessionId: string,
  includeMessages: boolean = true
): Promise<SessionDTO | null>
```

**Returns:**
- `SessionDTO` if session found
- `null` if session not found

## 6. Security Considerations

### Current MVP (No Authentication):

1. **Public Access:**
   - All sessions are publicly accessible by ID
   - No user ownership validation
   - UUID obscurity provides minimal security

2. **UUID Format Validation:**
   - Strict UUID validation prevents SQL injection
   - Parameterized queries used throughout
   - No string concatenation in queries

3. **Response Headers:**
   - `Content-Type: application/json`
   - `X-Content-Type-Options: nosniff`
   - CORS headers as configured in Astro

4. **Data Sanitization:**
   - No user input in responses beyond validated UUID
   - Message content returned as-is (no HTML escaping needed in JSON)
   - All timestamps validated as proper ISO 8601 format

### Future (With Authentication):

1. **Row-Level Security (RLS):**
   - Enforce `user_id` matching authenticated user
   - Service queries automatically filtered by RLS policies
   - 404 response for unauthorized access (don't reveal existence)

2. **Rate Limiting:**
   - Implement per-user request throttling
   - Prevent session enumeration attacks
   - Log suspicious access patterns

3. **Audit Logging:**
   - Log session access events to `logs` table
   - Track unusual access patterns
   - Include user_id in log metadata

### Threats & Mitigations:

| Threat | Mitigation |
|--------|------------|
| Session ID enumeration | UUID v4 randomness (2^122 entropy), future RLS |
| SQL injection | Parameterized queries, Zod validation |
| DoS via large responses | Consider pagination for messages in future |
| Timing attacks | Consistent response times regardless of error type |
| XSS via message content | JSON serialization handles escaping, proper Content-Type |

## 7. Error Handling

### Error Hierarchy:

```typescript
try {
  // 1. Input validation (Zod)
  const params = validateInput(sessionId, include_messages);
  
  // 2. Service call
  const session = await SessionService.getSessionById(...);
  
  // 3. Null check
  if (!session) {
    return new Response(JSON.stringify({
      error: "not_found",
      message: "I've looked everywhere, and this session simply doesn't exist.",
      details: { sessionId }
    }), { status: 404 });
  }
  
  // 4. Success response
  return new Response(JSON.stringify(session), { status: 200 });
  
} catch (error) {
  // 5. Error handling
  if (error instanceof ZodError) {
    // 400 validation error
  } else if (error.code === 'PGRST116') {
    // 404 not found
  } else {
    // 500 internal error
  }
}
```

### Specific Error Scenarios:

#### 1. Invalid UUID Format (400)
**Trigger:** Path parameter is not valid UUID
```typescript
// Example: /api/sessions/not-a-uuid
{
  "error": "validation_error",
  "message": "That's not even a valid session ID. Did you just make that up?",
  "details": {
    "field": "sessionId",
    "issue": "Invalid UUID format"
  }
}
```

#### 2. Invalid Query Parameter (400)
**Trigger:** include_messages cannot be coerced to boolean
```typescript
// Example: ?include_messages=maybe
{
  "error": "validation_error",
  "message": "I need a simple yes or no. This boolean ambiguity is exhausting.",
  "details": {
    "field": "include_messages",
    "issue": "Must be boolean value"
  }
}
```

#### 3. Session Not Found (404)
**Trigger:** No session exists with given ID
```typescript
{
  "error": "not_found",
  "message": "I've looked everywhere, and this session simply doesn't exist. Perhaps it never did.",
  "details": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### 4. Database Connection Error (500)
**Trigger:** Supabase connection failure
```typescript
{
  "error": "database_error",
  "message": "The database is having an existential crisis. Try again in a moment.",
  "details": {
    "operation": "fetch_session"
  }
}
```
**Action:** Log to `logs` table with level="error", event_type="database_error"

#### 5. Query Execution Error (500)
**Trigger:** SQL query fails unexpectedly
```typescript
{
  "error": "database_error",
  "message": "Something went wrong while fetching your session. How unlike a computer.",
  "details": {
    "operation": "fetch_session"
  }
}
```
**Action:** Log error to `logs` table with session_id in metadata

### Logging Strategy:

**What to Log:**
- Validation errors (level: "info")
- 404 errors (level: "info")
- Database errors (level: "error")
- Unexpected exceptions (level: "error")

**What NOT to Log:**
- Message content (privacy)
- Full session data
- User identifying information (until auth implemented)

**Log Format:**
```typescript
{
  level: "error",
  event_type: "database_error",
  session_id: sessionId,
  metadata: {
    operation: "fetch_session",
    error_code: error.code,
    // Never include message content
  }
}
```

## 8. Performance Considerations

### Current Implementation:

1. **Query Optimization:**
   - Single query with JOINs is more efficient than multiple queries
   - Use database indexes: `idx_sessions_user_lookup`, `idx_messages_session_time_id`
   - Messages ordered in database, not in application code

2. **Response Size:**
   - Typical session: 15-30 messages in main, 5-10 in helper
   - Average message: 100-200 bytes
   - Estimated response size: 5-10 KB
   - Acceptable for MVP without pagination

3. **Database Load:**
   - Read-heavy operation (no writes)
   - Supabase connection pooling handles concurrency
   - Minimal CPU usage (indexed lookups)

### Potential Bottlenecks:

1. **Large Message History:**
   - Sessions with 100+ messages could slow response
   - Current limit: ~100 messages per session (acceptable)
   - **Mitigation:** `include_messages=false` for metadata-only requests

2. **Concurrent Requests:**
   - Multiple users fetching sessions simultaneously
   - **Mitigation:** Supabase connection pooling, database read replicas (future)

3. **Network Latency:**
   - Supabase cloud introduces network round-trip
   - **Mitigation:** Consider edge caching for completed sessions (future)

### Optimization Opportunities (Future):

1. **Pagination for Messages:**
   - Add `limit` and `offset` query parameters
   - Return pagination metadata
   - Reduce initial response size

2. **Response Caching:**
   - Cache completed sessions (immutable data)
   - Use ETags for conditional requests
   - CDN caching for historical sessions

3. **Selective Field Loading:**
   - Add `fields` query parameter to select specific fields
   - Reduce payload size when full data not needed

4. **Database Query Optimization:**
   - Monitor slow query log
   - Add covering indexes if needed
   - Consider materialized views for analytics

## 9. Implementation Steps

### Step 1: Create Service Layer

**File:** `src/lib/services/session.service.ts`

1. Create `SessionService` class or module with exported functions
2. Implement `getSessionById(supabase, sessionId, includeMessages)` function
3. Build dynamic query based on `includeMessages` parameter
4. Execute query with parameterized sessionId
5. Transform database result to `SessionDTO` format
6. Handle null result (session not found)
7. Return typed `SessionDTO | null`

**Key Implementation Details:**
```typescript
// Use Supabase query builder
let query = supabase
  .from('sessions')
  .select(`
    id,
    user_id,
    scenario_id,
    is_completed,
    started_at,
    last_activity_at,
    completed_at,
    message_count_main,
    message_count_helper,
    duration_seconds,
    scenario:scenarios(id, title, emoji)
    ${includeMessages ? ', messages(id, role, chat_type, content, sent_at)' : ''}
  `)
  .eq('id', sessionId)
  .single();

if (includeMessages) {
  query = query.order('sent_at', { foreignTable: 'messages', ascending: true });
}
```

### Step 2: Create Input Validation Schemas

**File:** `src/lib/validation/session.validation.ts` (or inline in route)

1. Create Zod schema for path parameters:
   ```typescript
   const sessionIdSchema = z.string().uuid({
     message: "Invalid session ID format"
   });
   ```

2. Create Zod schema for query parameters:
   ```typescript
   const querySchema = z.object({
     include_messages: z.coerce.boolean().default(true)
   });
   ```

3. Export validation functions for reuse

### Step 3: Implement API Route Handler

**File:** `src/pages/api/sessions/[sessionId].ts`

1. Add required exports:
   ```typescript
   export const prerender = false;
   ```

2. Implement GET handler function:
   ```typescript
   export async function GET(context: APIContext) {
     // Implementation here
   }
   ```

3. Extract parameters:
   ```typescript
   const sessionId = context.params.sessionId;
   const url = new URL(context.request.url);
   const include_messages = url.searchParams.get('include_messages');
   ```

4. Validate inputs with Zod schemas

5. Access Supabase client from context:
   ```typescript
   const supabase = context.locals.supabase;
   ```

6. Call service layer:
   ```typescript
   const session = await SessionService.getSessionById(
     supabase,
     sessionId,
     includeMessages
   );
   ```

7. Handle null response (404)

8. Return success response with proper headers

### Step 4: Implement Error Handling

1. Wrap handler in try-catch block

2. Handle Zod validation errors (400):
   ```typescript
   if (error instanceof z.ZodError) {
     return new Response(
       JSON.stringify({
         error: "validation_error",
         message: "...",
         details: error.flatten()
       }),
       { status: 400, headers: { "Content-Type": "application/json" } }
     );
   }
   ```

3. Handle session not found (404)

4. Handle database errors (500)

5. Add generic error handler for unexpected exceptions

6. Log errors to console (and logs table when implemented)

### Step 5: Add Response Headers

1. Set Content-Type header:
   ```typescript
   { "Content-Type": "application/json" }
   ```

2. Add security headers:
   ```typescript
   {
     "X-Content-Type-Options": "nosniff",
     "Cache-Control": "no-store" // For MVP; change for completed sessions
   }
   ```

3. Ensure consistent header structure across all responses

### Step 6: Test Implementation

**Manual Tests:**

1. **Happy path - with messages:**
   ```bash
   curl http://localhost:3000/api/sessions/{valid-uuid}
   # Expect: 200 OK with full session and messages
   ```

2. **Happy path - without messages:**
   ```bash
   curl http://localhost:3000/api/sessions/{valid-uuid}?include_messages=false
   # Expect: 200 OK with session metadata only
   ```

3. **Invalid UUID:**
   ```bash
   curl http://localhost:3000/api/sessions/not-a-uuid
   # Expect: 400 Bad Request
   ```

4. **Non-existent session:**
   ```bash
   curl http://localhost:3000/api/sessions/{random-uuid}
   # Expect: 404 Not Found
   ```

5. **Invalid query parameter:**
   ```bash
   curl http://localhost:3000/api/sessions/{valid-uuid}?include_messages=maybe
   # Expect: 400 Bad Request
   ```

6. **Database connection test:**
   - Temporarily disable Supabase connection
   - Verify 500 error response
   - Verify error logging

**Integration Tests:**

1. Create test session in database
2. Verify retrieval matches expected structure
3. Verify message ordering (chronological)
4. Verify scenario embedding works correctly
5. Test with completed and incomplete sessions

### Step 7: Documentation and Type Safety

1. Ensure all functions have TypeScript return types

2. Add JSDoc comments for public functions:
   ```typescript
   /**
    * Retrieves a session by ID with optional messages
    * @param context - Astro API context
    * @returns Promise<Response> with SessionDTO or error
    */
   ```

3. Verify types match `src/types.ts` definitions

4. Test with TypeScript strict mode enabled

### Step 8: Performance Verification

1. Test with sessions containing varying message counts:
   - 0 messages (just created)
   - 10 messages (typical)
   - 50 messages (large)
   - 100 messages (max expected)

2. Measure response times:
   - Target: < 200ms for typical session
   - Target: < 500ms for large session

3. Verify database query uses indexes:
   - Check Supabase dashboard query performance
   - Verify `EXPLAIN ANALYZE` shows index usage

4. Test concurrent requests:
   - Simulate 10-20 concurrent GET requests
   - Verify no connection pool exhaustion

### Step 9: Finalization

1. Run linter and fix issues:
   ```bash
   npm run lint
   ```

2. Format code:
   ```bash
   npm run format
   ```

3. Review error messages for helper personality consistency

4. Verify no sensitive data in logs

5. Create/update API documentation

6. Mark task as complete

---

## Additional Notes

### Helper Personality Voice Guidelines

All error messages should maintain the helper's sarcastic, philosophical character:

- ✅ "I've looked everywhere, and this session simply doesn't exist. Perhaps it never did."
- ✅ "That's not even a valid session ID. Did you just make that up?"
- ✅ "The database is having an existential crisis. Try again in a moment."
- ❌ "Session not found"
- ❌ "Invalid UUID"
- ❌ "Database error"

### Future Enhancements

1. **Message Pagination:**
   - Add `limit` and `offset` query parameters
   - Return `PaginationDTO` in response
   - Update service layer to support pagination

2. **Field Selection:**
   - Add `fields` query parameter
   - Support selective field loading
   - Reduce response payload size

3. **Caching:**
   - Cache completed sessions (immutable)
   - Use ETags for conditional requests
   - Add `Cache-Control` headers for completed sessions

4. **Authentication Integration:**
   - Add RLS policy checks
   - Validate user ownership
   - Update logging to include user_id

5. **Analytics:**
   - Track session view frequency
   - Log access patterns
   - Monitor popular scenarios

### Related Endpoints

This endpoint works in conjunction with:

- `POST /api/sessions` - Creates new sessions (returns initial SessionCreatedDTO)
- `GET /api/sessions/:sessionId/messages` - Dedicated message list with pagination
- `PATCH /api/sessions/:sessionId/complete` - Marks session as completed
- `POST /api/sessions/:sessionId/messages` - Sends messages to session

Ensure consistent data structures and error handling across all session-related endpoints.

