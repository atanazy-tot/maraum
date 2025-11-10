# REST API Plan - Maraum MVP

> **Note:** Authentication and authorization have been deferred to a separate development task. This version of the API plan does not include user authentication, session management, or access control mechanisms. All endpoints are currently public and operate without user context.

> **Note:** The initial implementation uses the standard Claude API (non-streaming) and returns complete responses. The character-by-character streaming effect will be implemented client-side in the UI. Server-Sent Events (SSE) will be added in a future iteration.

## Overview

This REST API plan supports the Maraum MVP, a German language learning platform with dual-chat interface. The API is built on Astro 5 with SSR, uses Supabase PostgreSQL database, and integrates with Anthropic's Claude API for AI-powered conversations.

**Key Design Principles:**
- RESTful resource-oriented architecture
- Synchronous AI responses (streaming effect handled client-side)
- Idempotent operations where applicable
- Comprehensive validation and error handling
- **Authentication deferred:** No user authentication or authorization in current implementation
- **Streaming deferred:** Standard API responses; client-side streaming effect for MVP

---

## 1. Resources

### 1.1 Core Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| Profile | `profiles` | User profile extending Supabase Auth |
| Scenario | `scenarios` | Static scenario configurations (3 pre-defined for MVP) |
| Session | `sessions` | Conversation attempts through scenarios |
| Message | `messages` | Individual chat messages (immutable) |
| Log | `logs` | System operational events (system-only access) |

### 1.2 Resource Relationships

```
Profile (1) ──→ (N) Sessions
Session (N) ──→ (1) Scenario
Session (1) ──→ (N) Messages
```

**Business Constraints:**
- One user can have only ONE active (incomplete) session at a time
- Messages are immutable once created
- Weekly limit: 3 completed scenarios per user per week

---

## 2. Endpoints

### 2.1 Profile Endpoints

> **Note:** Profile endpoints are currently deferred. Without authentication, there is no concept of individual user profiles in this implementation.

**Deferred to authentication implementation:**
- GET `/api/profile` - Get current user profile
- DELETE `/api/profile` - Delete account

---

### 2.2 Scenario Endpoints

#### 2.2.1 List Available Scenarios
- **Method:** GET
- **URL:** `/api/scenarios`
- **Description:** Retrieve all active scenarios
- **Authentication:** Not required (deferred)
- **Query Parameters:** None (all scenarios returned for MVP)
- **Response (200 OK):**
```json
{
  "scenarios": [
    {
      "id": 1,
      "title": "Marketplace Encounter",
      "emoji": "🛒",
      "sort_order": 1,
      "is_active": true,
      "initial_message_main": "Du stehst auf einem belebten Wochenmarkt...",
      "initial_message_helper": "Ah, you're attempting German. How ambitious..."
    },
    {
      "id": 2,
      "title": "High School Party",
      "emoji": "🎉",
      "sort_order": 2,
      "is_active": true,
      "initial_message_main": "Du bist auf einer Party...",
      "initial_message_helper": "A party. How delightfully anxiety-inducing..."
    },
    {
      "id": 3,
      "title": "Late Night Kebab",
      "emoji": "🥙",
      "sort_order": 3,
      "is_active": true,
      "initial_message_main": "Es ist 2 Uhr morgens...",
      "initial_message_helper": "The classic Berlin experience..."
    }
  ]
}
```
- **Errors:**
  - `500 Internal Server Error` - Database error

**Business Logic:**
- Only returns `is_active = true` scenarios
- All scenario data publicly accessible (no user context)
- Initial messages included for immediate session start

#### 2.2.2 Get Single Scenario
- **Method:** GET
- **URL:** `/api/scenarios/:scenarioId`
- **Description:** Retrieve specific scenario details
- **Authentication:** Not required (deferred)
- **Path Parameters:** 
  - `scenarioId` (integer) - Scenario ID
- **Response (200 OK):**
```json
{
  "id": 1,
  "title": "Marketplace Encounter",
  "emoji": "🛒",
  "sort_order": 1,
  "is_active": true,
  "initial_message_main": "Du stehst auf einem belebten Wochenmarkt...",
  "initial_message_helper": "Ah, you're attempting German. How ambitious...",
  "created_at": "2024-10-01T00:00:00Z",
  "updated_at": "2024-10-01T00:00:00Z"
}
```
- **Errors:**
  - `404 Not Found` - Scenario doesn't exist or not active
  - `500 Internal Server Error` - Database error

---

### 2.3 Session Endpoints

#### 2.3.1 Get Session by ID
- **Method:** GET
- **URL:** `/api/sessions/:sessionId`
- **Description:** Retrieve specific session with messages
- **Authentication:** Not required (deferred)
- **Path Parameters:**
  - `sessionId` (uuid) - Session ID
- **Query Parameters:**
  - `include_messages` (boolean, default: true) - Include message history
- **Response (200 OK):**
```json
{
  "id": "session-uuid",
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
  "messages": [...]
}
```
- **Errors:**
  - `404 Not Found` - Session doesn't exist
  - `400 Bad Request` - Invalid query parameters
  - `500 Internal Server Error` - Database error

**Business Logic:**
- Without authentication, `user_id` is always NULL
- Messages ordered by `sent_at ASC`
- If `include_messages=false`, returns session metadata only

#### 2.3.2 Create Session (Start Scenario)
- **Method:** POST
- **URL:** `/api/sessions`
- **Description:** Start new scenario session
- **Authentication:** Not required (deferred)
- **Request Payload:**
```json
{
  "scenario_id": 1
}
```
- **Response (201 Created):**
```json
{
  "id": "new-session-uuid",
  "user_id": null,
  "scenario_id": 1,
  "scenario": {
    "id": 1,
    "title": "Marketplace Encounter",
    "emoji": "🛒"
  },
  "is_completed": false,
  "started_at": "2024-11-10T15:00:00Z",
  "last_activity_at": "2024-11-10T15:00:00Z",
  "completed_at": null,
  "message_count_main": 0,
  "message_count_helper": 0,
  "duration_seconds": null,
  "initial_messages": [
    {
      "id": "message-uuid-1",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Du stehst auf einem belebten Wochenmarkt...",
      "sent_at": "2024-11-10T15:00:00Z"
    },
    {
      "id": "message-uuid-2",
      "role": "helper_assistant",
      "chat_type": "helper",
      "content": "Ah, you're attempting German. How ambitious...",
      "sent_at": "2024-11-10T15:00:00Z"
    }
  ]
}
```
- **Errors:**
  - `400 Bad Request` - Missing or invalid scenario_id
  - `404 Not Found` - Scenario doesn't exist or not active
  - `500 Internal Server Error` - Database error

**Validation:**
- Scenario must exist and be active (`is_active = true`)

**Business Logic:**
1. Validate scenario exists and is active
2. Create session record with `user_id = NULL` (no authentication)
3. Insert initial messages (main and helper) from scenario configuration
4. Log `session_created` event
5. Return session with initial messages

**Note:** Without authentication:
- Single active session constraint is not enforced (deferred to auth implementation)
- Weekly rate limiting is not enforced (deferred to auth implementation)
- Multiple concurrent sessions can exist

#### 2.3.3 Complete Session
- **Method:** PATCH
- **URL:** `/api/sessions/:sessionId/complete`
- **Description:** Mark session as completed (called when LLM completion flag detected)
- **Authentication:** Not required (deferred)
- **Path Parameters:**
  - `sessionId` (uuid) - Session ID
- **Request Payload:** None (or empty JSON object)
- **Response (200 OK):**
```json
{
  "id": "session-uuid",
  "is_completed": true,
  "completed_at": "2024-11-10T15:30:00Z",
  "duration_seconds": 1800,
  "message_count_main": 23,
  "message_count_helper": 6
}
```
- **Errors:**
  - `404 Not Found` - Session doesn't exist
  - `409 Conflict` - Session already completed
  - `500 Internal Server Error` - Database error

**Business Logic:**
1. Check `is_completed = false`
2. Set `is_completed = true`
3. Database trigger automatically:
   - Sets `completed_at = NOW()`
   - Calculates `duration_seconds = EXTRACT(EPOCH FROM (completed_at - started_at))`
4. Log `scenario_completed` event
5. Return updated session

**Note:** Without authentication, profile completion counts are not incremented (deferred to auth implementation)

---

### 2.4 Message Endpoints

#### 2.4.1 Send Message and Get AI Response
- **Method:** POST
- **URL:** `/api/sessions/:sessionId/messages`
- **Description:** Send user message and receive complete AI response
- **Authentication:** Not required (deferred)
- **Path Parameters:**
  - `sessionId` (uuid) - Session ID
- **Request Payload:**
```json
{
  "chat_type": "main",
  "content": "Ich möchte drei Äpfel kaufen.",
  "client_message_id": "client-generated-uuid"
}
```
- **Response (200 OK):**
```json
{
  "user_message": {
    "id": "user-message-uuid",
    "role": "user",
    "chat_type": "main",
    "content": "Ich möchte drei Äpfel kaufen.",
    "sent_at": "2024-11-10T15:05:00Z"
  },
  "assistant_message": {
    "id": "assistant-message-uuid",
    "role": "main_assistant",
    "chat_type": "main",
    "content": "Natürlich! Drei Äpfel kosten zwei Euro.",
    "sent_at": "2024-11-10T15:05:08Z"
  },
  "session_complete": false,
  "completion_flag_detected": false
}
```

**Response with Session Completion (200 OK):**
```json
{
  "user_message": {
    "id": "user-message-uuid",
    "role": "user",
    "chat_type": "main",
    "content": "Vielen Dank!",
    "sent_at": "2024-11-10T15:20:00Z"
  },
  "assistant_message": {
    "id": "assistant-message-uuid",
    "role": "main_assistant",
    "chat_type": "main",
    "content": "Gerne! Einen schönen Tag noch!",
    "sent_at": "2024-11-10T15:20:05Z"
  },
  "session_complete": true,
  "completion_flag_detected": true,
  "session": {
    "id": "session-uuid",
    "is_completed": true,
    "completed_at": "2024-11-10T15:20:05Z",
    "duration_seconds": 1205
  }
}
```

**Errors:**
- `404 Not Found` - Session doesn't exist
- `409 Conflict` - Session already completed
- `400 Bad Request` - Invalid chat_type or content
- `413 Payload Too Large` - Content exceeds 8000 characters
- `500 Internal Server Error` - AI API failure after retries
- `504 Gateway Timeout` - AI API timeout (30s for main, 20s for helper)

**Validation:**
- `chat_type` must be 'main' or 'helper'
- `content` must be non-empty and <= 8000 characters
- `client_message_id` optional but recommended for idempotency
- Session must exist
- Session must not be completed (`is_completed = false`)

**Business Logic:**
1. Verify session exists and not completed
2. Check if `client_message_id` already exists for this session (idempotency)
   - If yes, return existing messages (don't reprocess)
3. Save user message to database:
   - `role = 'user'`
   - `chat_type` from request
   - `user_id` set to NULL (no authentication)
   - Database trigger increments `message_count_main` or `message_count_helper`
   - Database trigger updates `last_activity_at`
4. Prepare AI prompt:
   - Load scenario prompt template from .MD file
   - Load conversation history (last 20 messages for context window)
   - For main chat: System prompt enforces German, includes scenario context
   - For helper chat: System prompt includes helper personality, conversation awareness
5. Call Claude API (standard, non-streaming):
   - Model: claude-4.5-haiku
   - Temperature: 0.9 (main), 0.7 (helper)
   - Max tokens: 2000 (main), 1000 (helper)
   - Timeout: 30s (main), 20s (helper)
   - Retry: 3 attempts with exponential backoff
6. Receive complete response from Claude
7. Parse response for completion flag (if main chat):
   - If completion flag detected, trigger session completion internally
   - Include completion data in response
8. Save complete AI message to database:
   - `role = 'main_assistant'` or `helper_assistant`
   - `chat_type` from request
   - `content` = full response from Claude
   - `user_id` set to NULL (no authentication)
9. Return JSON response with both messages and completion status
10. Log API call metrics

**Client-Side Streaming Effect:**
- Client receives complete response
- UI implements character-by-character display animation
- No server-side streaming required for MVP

**Error Handling:**
- If API timeout: Return 504 Gateway Timeout with error message
- If API failure after retries: Return 500 Internal Server Error
- User message already saved before API call (preserved on failure)
- Client can retry with same `client_message_id` (idempotent)

**Idempotency:**
- If `client_message_id` provided and already exists for this session:
  - Return existing user message and subsequent assistant message
  - No new AI API call
  - No new database writes
  - Return standard JSON response with existing data

#### 2.4.2 Get Session Messages
- **Method:** GET
- **URL:** `/api/sessions/:sessionId/messages`
- **Description:** Retrieve all messages for a session (for restoration/replay)
- **Authentication:** Not required (deferred)
- **Path Parameters:**
  - `sessionId` (uuid) - Session ID
- **Query Parameters:**
  - `chat_type` (string, optional) - Filter by chat: `main`, `helper`, `all` (default: `all`)
  - `limit` (integer, default: 100, max: 500) - Number of messages
  - `offset` (integer, default: 0) - Pagination offset
  - `order` (string, default: `asc`) - Sort order: `asc`, `desc` (by sent_at)
- **Response (200 OK):**
```json
{
  "messages": [
    {
      "id": "message-uuid-1",
      "session_id": "session-uuid",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Du stehst auf einem belebten Wochenmarkt...",
      "sent_at": "2024-11-10T14:00:00Z"
    },
    {
      "id": "message-uuid-2",
      "role": "user",
      "chat_type": "main",
      "content": "Guten Tag! Ich suche frisches Gemüse.",
      "sent_at": "2024-11-10T14:01:00Z"
    },
    {
      "id": "message-uuid-3",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Natürlich! Wir haben heute frische Tomaten, Gurken und Paprika.",
      "sent_at": "2024-11-10T14:01:05Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 28,
    "has_more": false
  }
}
```
- **Errors:**
  - `404 Not Found` - Session doesn't exist
  - `400 Bad Request` - Invalid query parameters
  - `500 Internal Server Error` - Database error

**Business Logic:**
- All sessions publicly accessible (no authentication)
- Default order is ascending (chronological) for replay
- Typical session has ~100 messages (main + helper combined)
- Client can filter by `chat_type` to load main/helper separately

---

### 2.5 System Endpoints

#### 2.5.1 Health Check
- **Method:** GET
- **URL:** `/api/health`
- **Description:** Service health check
- **Authentication:** Not required
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-10T15:00:00Z",
  "services": {
    "database": "connected"
  }
}
```
- **Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-11-10T15:00:00Z",
  "services": {
    "database": "error"
  }
}
```

---

## 3. Validation and Business Logic

### 3.1 Request Validation

#### 3.1.1 Session Validation
- `scenario_id`: Must exist in scenarios table and `is_active = true`
- `is_completed`: Boolean (default: false)
- `completed_at`: Must be NULL or >= `started_at` (enforced by database)
- `message_count_main`: Integer >= 0 (managed by triggers)
- `message_count_helper`: Integer >= 0 (managed by triggers)
- `duration_seconds`: Integer >= 0 or NULL (calculated by trigger)

#### 3.1.2 Message Validation
- `role`: Must be 'user', 'main_assistant', or 'helper_assistant'
- `chat_type`: Must be 'main' or 'helper'
- `content`: Required, max 8000 characters
- `client_message_id`: UUID format if provided

**Cross-field Validation:**
- `main_assistant` role must have `chat_type = 'main'`
- `helper_assistant` role must have `chat_type = 'helper'`
- `user` role can have either chat_type

### 3.2 Business Logic Rules

#### 3.2.1 Session Completion Logic
**Location:** POST `/api/sessions/:sessionId/messages`, PATCH `/api/sessions/:sessionId/complete`

**Completion Detection (in message endpoint):**
1. After receiving complete AI response, parse for completion flag
2. Completion flag format defined in scenario prompt template (e.g., `[SCENARIO_COMPLETE]`)
3. If flag detected:
   - Call internal completion logic (or PATCH `/api/sessions/:sessionId/complete`)
   - Include completion data in JSON response (`session_complete: true`)
4. If message count >= 30 (hard cap):
   - AI prompt includes instruction to conclude naturally
   - Treat as completion regardless of flag

**Completion Actions (in complete endpoint or internal call):**
1. Verify `is_completed = false`
2. Set `is_completed = true`
3. Database trigger automatically:
   - Sets `completed_at = NOW()`
   - Calculates `duration_seconds`
4. Log `scenario_completed` event
5. Return updated session

**Note:** Without authentication, profile completion counts are not incremented (deferred to auth implementation)

#### 3.2.2 Message Immutability
**Location:** Database trigger (enforced), no UPDATE endpoint exists

**Logic:**
- Database trigger `messages_immutable` blocks all UPDATE attempts
- API does not expose UPDATE or DELETE endpoints for messages
- Only INSERT allowed via POST `/api/sessions/:sessionId/messages`

**Enforcement:**
```sql
CREATE TRIGGER messages_immutable
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_message_updates();
```

#### 3.2.3 Prevent Messages in Completed Sessions
**Location:** POST `/api/sessions/:sessionId/messages`

**Logic:**
1. Before saving user message, check session status
2. Query: `SELECT is_completed FROM sessions WHERE id = $1`
3. If `is_completed = true`, return 409 Conflict
4. Database trigger also enforces this

**Error Response:**
```json
{
  "error": "session_completed",
  "message": "Cannot send messages to completed session.",
  "details": {
    "session_id": "uuid",
    "completed_at": "2024-11-10T15:30:00Z"
  }
}
```

#### 3.2.4 Automatic Message Count Updates
**Location:** Database trigger (automatic)

**Logic:**
- Trigger `increment_message_count` fires AFTER INSERT on messages
- Increments `message_count_main` or `message_count_helper` based on `chat_type`
- Updates `last_activity_at = NOW()`
- No explicit API logic needed

#### 3.2.5 Session Expiration Cleanup (Deferred)
**Location:** Scheduled job (outside API), database function `delete_expired_sessions()`

**Note:** Session expiration cleanup is deferred until authentication is implemented. Without user context, determining "abandoned" sessions is not meaningful.

**Future Implementation:**
1. Cron job calls: `SELECT delete_expired_sessions()`
2. Function deletes sessions where:
   - `is_completed = false`
   - `last_activity_at < NOW() - INTERVAL '7 days'`
3. Cascading deletion removes associated messages
4. Logs cleanup event with deletion count
5. Returns number of deleted sessions

#### 3.2.6 Old Logs Cleanup
**Location:** Scheduled job (outside API), database function `delete_old_logs()`

**Logic:**
1. Cron job calls: `SELECT delete_old_logs()`
2. Function deletes logs where:
   - `created_at < NOW() - INTERVAL '30 days'`
3. Logs cleanup execution event
4. Returns number of deleted logs

**Schedule:** Daily at 01:00 UTC

### 3.3 Error Response Format

All API errors follow consistent format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message in helper's voice",
  "details": {
    "field": "additional context",
    "timestamp": "2024-11-10T15:00:00Z"
  }
}
```

**Common Error Codes:**
- `not_found` - 404 Not Found
- `validation_error` - 400 Bad Request
- `session_completed` - 409 Conflict
- `api_timeout` - 504 Gateway Timeout
- `api_failure` - 500 Internal Server Error
- `database_error` - 500 Internal Server Error

**Error Messages in Helper's Voice:**
- "Connection lost. How disappointing. Your progress is safe, try again."
- "The API has abandoned us. Typical. Refresh and we'll continue."

### 3.4 Logging and Monitoring

**Location:** Database `logs` table, inserted via service role

**Logged Events:**
- `api_call_started` - API request received
- `api_call_completed` - API request succeeded
- `api_call_failed` - API request failed
- `api_call_timeout` - API timeout
- `api_retry_attempted` - Retry attempted
- `scenario_started` - Session created
- `scenario_completed` - Session completed
- `session_restored` - Session loaded
- `database_error` - Database operation failed

**Log Structure:**
```sql
INSERT INTO logs (level, event_type, user_id, session_id, metadata)
VALUES (
  'info',
  'api_call_completed',
  'user-uuid',
  'session-uuid',
  jsonb_build_object(
    'endpoint', '/api/sessions/uuid/messages',
    'method', 'POST',
    'status_code', 200,
    'duration_ms', 1234,
    'timestamp', NOW()
  )
);
```

**Privacy Constraint:**
- Message content NEVER logged
- Only metadata (IDs, timestamps, counts, status codes)

---

## 4. API Performance and Optimization

### 4.1 Response Time Targets

| Endpoint | Target | Maximum |
|----------|--------|---------|
| GET /api/scenarios | < 1s | 2s |
| GET /api/sessions/:id | < 1s | 3s |
| POST /api/sessions | < 1s | 2s |
| POST /api/sessions/:id/messages | < 8s | 15s |
| GET /api/sessions/:id/messages | < 1s | 2s |

**Note:** Message endpoint timing includes full Claude API round-trip (non-streaming). Client-side animation provides streaming UX while waiting.

### 4.2 Pagination Defaults

| Endpoint | Default Limit | Max Limit |
|----------|---------------|-----------|
| GET /api/sessions/:id/messages | 100 | 500 |

### 4.3 Database Query Optimization

**Indexes Used:**
- `idx_sessions_active_per_user` - Unique partial index for active session lookup (deferred with auth)
- `idx_sessions_user_lookup` - Composite index on (user_id, is_completed)
- `idx_messages_session_time_id` - Composite index for message chronology
- `idx_messages_user_id` - User context optimization (deferred with auth)

**Connection Pooling:**
- Supabase connection pooler (PgBouncer)
- Max connections: 15 (transaction mode)

### 4.4 Caching Strategy

**Static Data (MVP - no caching):**
- Scenarios rarely change, could cache
- Deferred to post-MVP for simplicity

**Session Data (no caching):**
- Session data changes frequently
- Real-time consistency required

---

## 5. AI Integration Details

### 5.1 Claude API Configuration (Non-Streaming)

**Model:** `claude-4.5-haiku`

**API Type:** Standard (non-streaming) Messages API
- Returns complete response in single HTTP request
- No Server-Sent Events (SSE) implementation
- Client-side implements streaming effect for UX

**Main Chat (Scenario):**
- Temperature: 0.9
- Max tokens: 2000
- Timeout: 30s
- Retry: 3 attempts (exponential backoff: 1s, 2s, 4s)

**Helper Chat:**
- Temperature: 0.7
- Max tokens: 1000
- Timeout: 20s
- Retry: 3 attempts (exponential backoff: 1s, 2s, 4s)

**API Endpoint:**
- POST `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version`, `content-type: application/json`

### 5.2 Prompt Template Structure

**Storage:** `.md` files in version control (not database)

**Location:**
- `/prompts/scenarios/marketplace.md` - Marketplace scenario
- `/prompts/scenarios/party.md` - Party scenario
- `/prompts/scenarios/kebab.md` - Kebab scenario
- `/prompts/helper-base.md` - Helper personality base prompt

**Prompt Components:**
1. System instruction (role, language, constraints)
2. Scenario context (setting, characters, objectives)
3. Conversation history (last 20 messages for context)
4. Vocabulary guidance (B1-B2 level appropriate)
5. Completion criteria (message count awareness)
6. Example exchanges (3-5 per scenario)

**Completion Flag:**
- Format: `[SCENARIO_COMPLETE]` at end of assistant message
- Parsed by backend, not shown to user
- Triggers PATCH `/api/sessions/:sessionId/complete`

### 5.3 Context Window Management

**Main Chat:**
- Last 20 messages included in prompt
- Includes both user and assistant messages
- Truncates older messages to stay within token limit
- System prompt + scenario context + history < 4000 tokens

**Helper Chat:**
- Last 10 messages from main chat (for context)
- Last 5 messages from helper chat (for continuity)
- System prompt + personality + context < 2000 tokens

### 5.4 Error Handling for AI API

**Timeout:**
- Main chat: 30s
- Helper chat: 20s
- Return 504 Gateway Timeout with error JSON

**Failure After Retries:**
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Return 500 Internal Server Error with error JSON
- Log failure details with full context
- Preserve user message (saved before API call)
- Allow retry via same endpoint (idempotent via `client_message_id`)

**Content Filtering:**
- If Claude returns content filter error
- Treat as scenario completion (graceful handling)
- Log event for review
- Return normal completion response to user

**Network Errors:**
- Catch connection errors and network timeouts
- Return 500 Internal Server Error
- Include retry-friendly error message
- User message preserved for retry

**Rate Limiting (Anthropic):**
- If 429 response from Claude API
- Wait and retry with exponential backoff
- If still failing after retries, return 503 Service Unavailable
- Suggest user retry after a few minutes

---

## 6. Deployment and Environment

### 6.1 Environment Variables

**Required:**
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-key

# Application
NODE_ENV=production
PORT=3000
BASE_URL=https://maraum.app
```

**Note:** Authentication-related environment variables (SESSION_SECRET, etc.) deferred to auth implementation.

### 6.2 Deployment Architecture

**Platform:** DigitalOcean (self-hosted VM via Docker)
**Process Manager:** PM2
**Reverse Proxy:** Nginx
**SSL:** Let's Encrypt (via Nginx)

**Docker Configuration:**
- Multi-stage build for optimization
- Node 20 LTS base image
- Production-only dependencies
- Health check endpoint: `/api/health`

**Nginx Configuration:**
- HTTPS only (HTTP → HTTPS redirect)
- Proxy to Node.js on port 3000
- Request timeout: 60s (to accommodate Claude API response time)
- Client max body size: 10MB
- Standard HTTP/1.1 proxying (no WebSocket/SSE required for MVP)

### 6.3 Monitoring and Alerting

**Health Checks:**
- GET `/api/health` every 60s
- Alert if unhealthy for 5 minutes

**Database Monitoring:**
- Connection count
- Query duration (slow query log > 1s)
- Table sizes (alerts at 80% capacity)

**AI API Monitoring:**
- Success rate (alert if < 90%)
- Average response time (alert if > 10s)
- Timeout rate (alert if > 5%)
- Cost per session (alert if > $0.50)

**Application Logs:**
- Winston logger with daily rotation
- Log levels: error, warn, info, debug
- Error logs retained 90 days
- Info logs retained 7 days

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Scope:**
- Validation functions
- Business logic functions (completion detection)
- Prompt template loading

**Framework:** Vitest

### 7.2 Integration Tests

**Scope:**
- API endpoints (all CRUD operations)
- Session creation and completion
- Message exchange with Claude API
- Response format validation
- Error handling and retries

**Framework:** Vitest + Supertest
**Database:** Test database (Supabase test project)

### 7.3 End-to-End Tests

**Scope:**
- Full user journey (scenario → messages → completion)
- Error scenarios (session completion)
- Session restoration

**Framework:** Playwright

### 7.4 Load Testing

**Scope:**
- Concurrent users (10 users)
- Message throughput (100 messages/minute)
- API response time under load
- Database connection pool behavior

**Framework:** K6

**Note:** Streaming performance testing deferred until SSE implementation

---

## 8. API Versioning and Evolution

### 8.1 Versioning Strategy (MVP)

**Approach:** No versioning for MVP
- Single version in `/api/*` namespace
- Breaking changes avoided until post-MVP
- Additive changes (new fields) acceptable

### 8.2 Post-MVP Versioning

**Approach:** URL path versioning
- `/api/v1/*` for stable API
- `/api/v2/*` for breaking changes
- Deprecation period: 3 months

### 8.3 API Changelog

**Location:** `/api/changelog` endpoint (future)

**Format:**
```json
{
  "current_version": "1.0.0",
  "changes": [
    {
      "version": "1.0.0",
      "date": "2024-11-10",
      "changes": [
        "Initial MVP release"
      ]
    }
  ]
}
```

---

## 9. Appendix

### 9.1 HTTP Status Code Reference

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE, empty response |
| 400 | Bad Request | Validation error, malformed request |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Business rule violation (completed session) |
| 413 | Payload Too Large | Request body exceeds limit |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service down or degraded |
| 504 | Gateway Timeout | Upstream timeout (AI API) |

**Note:** 401 (Unauthorized) and 403 (Forbidden) deferred to authentication implementation.

### 9.2 Message Role and Chat Type Reference

**Roles:**
- `user` - Human user message
- `main_assistant` - AI NPC in German scenario chat
- `helper_assistant` - AI companion in English helper chat

**Chat Types:**
- `main` - Left panel (魔), German scenario
- `helper` - Right panel (間), English helper

**Valid Combinations:**
- `user` + `main` ✓
- `user` + `helper` ✓
- `main_assistant` + `main` ✓
- `helper_assistant` + `helper` ✓
- `main_assistant` + `helper` ✗ (invalid)
- `helper_assistant` + `main` ✗ (invalid)

### 9.3 Client-Side Streaming Implementation

**Purpose:** Create character-by-character typing effect without server-side streaming

**Approach:**
- Server returns complete response as JSON
- Client receives full text immediately
- UI implements animation to display text progressively

**Example Implementation:**
```javascript
async function sendMessage(sessionId, content, chatType) {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_type: chatType, content })
  });
  
  const data = await response.json();
  
  // Animate assistant message character-by-character
  const assistantContent = data.assistant_message.content;
  for (let i = 0; i < assistantContent.length; i++) {
    displayCharacter(assistantContent[i]);
    await sleep(20); // 20ms per character = ~50 chars/sec
  }
  
  // Handle session completion
  if (data.session_complete) {
    handleCompletion(data.session);
  }
}
```

**Benefits:**
- Simpler backend implementation
- No SSE/WebSocket infrastructure required
- Same UX as streaming from user perspective
- Complete message available for retry/idempotency

**Future Enhancement:**
- Migrate to SSE when scaling requires optimized latency
- Current approach sufficient for MVP with ~10 concurrent users

---

**Document Version:** 1.2 (Authentication Deferred, Non-Streaming API)  
**Last Updated:** 2024-11-10  
**Status:** Draft for MVP Development - No Authentication, No Server Streaming  
**Next Review:** Post-Phase 0 completion or when authentication/streaming is implemented  
**Changes from v1.0:** 
- v1.1: Removed all authentication and authorization sections; modified endpoints to operate without user context
- v1.2: Changed from streaming API to standard Claude API; client-side implements streaming effect

