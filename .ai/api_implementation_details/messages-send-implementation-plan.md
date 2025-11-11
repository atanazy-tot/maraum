# API Endpoint Implementation Plan: Send Message and Get AI Response

## 1. Endpoint Overview

**Purpose:** Send a user message to a specific chat (main or helper) and receive a complete AI response from Claude API. This endpoint handles the core conversational loop of the application, including message persistence, AI integration, session completion detection, and idempotency support.

**Key Features:**
- Send user messages to either main (German scenario) or helper (English assistant) chat
- Receive complete AI-generated responses (non-streaming; client handles streaming effect)
- Automatic session completion detection via AI completion flags
- Idempotency support via optional client_message_id
- Prevent messages in completed sessions
- Message immutability (write-once)
- Comprehensive error handling with retries
- Privacy-compliant logging (metadata only)

**Use Cases:**
- User sends message in main chat to practice German conversation
- User asks helper for vocabulary, grammar tips, or conversation suggestions
- System automatically detects scenario completion and closes session
- Network failures handled gracefully with retry capability
- Session restoration after interruption

---

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
```
/api/sessions/:sessionId/messages
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | UUID | Yes | Unique identifier of the session |

### Request Body

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `chat_type` | ChatType | Yes | Must be 'main' or 'helper' | Target chat panel |
| `content` | string | Yes | Non-empty, max 8000 characters | User message text |
| `client_message_id` | UUID | No | Valid UUID format if provided | Idempotency key |

### Request Headers
```
Content-Type: application/json
```

### Example Requests

**Main chat message:**
```json
POST /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages
{
  "chat_type": "main",
  "content": "Ich möchte drei Äpfel kaufen.",
  "client_message_id": "client-uuid-123"
}
```

**Helper chat message:**
```json
POST /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages
{
  "chat_type": "helper",
  "content": "How do I say 'I would like' in German?",
  "client_message_id": "client-uuid-456"
}
```

**Message without idempotency key (not recommended for production):**
```json
POST /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages
{
  "chat_type": "main",
  "content": "Vielen Dank!"
}
```

---

## 3. Used Types

### Command Models

**SendMessageCommand** (from `src/types.ts`)
```typescript
interface SendMessageCommand {
  chat_type: ChatType;
  content: string;
  client_message_id?: string;
}
```

### Response DTOs

**MessageResponseDTO** (from `src/types.ts`)
```typescript
interface MessageResponseDTO {
  user_message: MessageDTO;
  assistant_message: MessageDTO;
  session_complete: boolean;
  completion_flag_detected: boolean;
  session?: SessionCompletionDTO;
}
```

**MessageDTO** (from `src/types.ts`)
```typescript
type MessageDTO = Pick<Tables<"messages">, "id" | "role" | "chat_type" | "content" | "sent_at">;
```

**SessionCompletionDTO** (from `src/types.ts`)
```typescript
type SessionCompletionDTO = Pick<
  Tables<"sessions">,
  "id" | "is_completed" | "completed_at" | "duration_seconds" | "message_count_main" | "message_count_helper"
>;
```

### Error DTOs

**ApiErrorDTO** (from `src/types.ts`)
```typescript
interface ApiErrorDTO {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### Type Aliases

**ChatType** (from `src/types.ts`)
```typescript
type ChatType = Enums<"chat_type_enum">; // 'main' | 'helper'
```

**MessageRole** (from `src/types.ts`)
```typescript
type MessageRole = Enums<"message_role">; // 'user' | 'main_assistant' | 'helper_assistant'
```

### Validation Schemas (to be created)

**Path Parameters Schema:**
```typescript
import { z } from 'zod';

const SendMessageParamsSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format' }),
});

type SendMessageParams = z.infer<typeof SendMessageParamsSchema>;
```

**Request Body Schema:**
```typescript
import { z } from 'zod';

const SendMessageBodySchema = z.object({
  chat_type: z.enum(['main', 'helper'], {
    errorMap: () => ({ message: "chat_type must be 'main' or 'helper'" }),
  }),
  content: z
    .string()
    .min(1, { message: 'content cannot be empty' })
    .max(8000, { message: 'content cannot exceed 8000 characters' }),
  client_message_id: z
    .string()
    .uuid({ message: 'client_message_id must be a valid UUID' })
    .optional(),
});

type SendMessageBody = z.infer<typeof SendMessageBodySchema>;
```

### Internal Types (Service Layer)

**ClaudeAPIRequest:**
```typescript
interface ClaudeAPIRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**ClaudeAPIResponse:**
```typescript
interface ClaudeAPIResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

**MessageHistoryItem:**
```typescript
interface MessageHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}
```

---

## 4. Response Details

### Success Response (200 OK)

**Standard Response (session continues):**
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
    "duration_seconds": 1205,
    "message_count_main": 18,
    "message_count_helper": 5
  }
}
```

**Idempotent Response (returning existing messages):**
```json
{
  "user_message": {
    "id": "existing-user-message-uuid",
    "role": "user",
    "chat_type": "main",
    "content": "Ich möchte drei Äpfel kaufen.",
    "sent_at": "2024-11-10T15:05:00Z"
  },
  "assistant_message": {
    "id": "existing-assistant-message-uuid",
    "role": "main_assistant",
    "chat_type": "main",
    "content": "Natürlich! Drei Äpfel kosten zwei Euro.",
    "sent_at": "2024-11-10T15:05:08Z"
  },
  "session_complete": false,
  "completion_flag_detected": false
}
```

### Error Responses

**400 Bad Request - Invalid Input**
```json
{
  "error": "validation_error",
  "message": "Invalid request parameters provided.",
  "details": {
    "chat_type": "chat_type must be 'main' or 'helper'",
    "content": "content cannot exceed 8000 characters"
  }
}
```

**400 Bad Request - Invalid UUID**
```json
{
  "error": "validation_error",
  "message": "Invalid session ID format.",
  "details": {
    "sessionId": "Must be a valid UUID"
  }
}
```

**404 Not Found - Session Doesn't Exist**
```json
{
  "error": "not_found",
  "message": "The requested session could not be found. Perhaps it never existed, or it was deleted.",
  "details": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**409 Conflict - Session Already Completed**
```json
{
  "error": "session_completed",
  "message": "Cannot send messages to completed session. This conversation has concluded.",
  "details": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "completed_at": "2024-11-10T15:30:00Z"
  }
}
```

**413 Payload Too Large - Content Exceeds Limit**
```json
{
  "error": "validation_error",
  "message": "Message content exceeds maximum allowed length.",
  "details": {
    "max_length": 8000,
    "provided_length": 8542
  }
}
```

**500 Internal Server Error - Database Error**
```json
{
  "error": "database_error",
  "message": "A database operation failed. Your progress should be safe, but you may need to refresh.",
  "details": {
    "timestamp": "2024-11-10T15:05:00Z"
  }
}
```

**500 Internal Server Error - AI API Failure**
```json
{
  "error": "api_failure",
  "message": "The AI service has failed after multiple attempts. Your message was saved; please try again.",
  "details": {
    "retry_count": 3,
    "last_error": "Connection timeout",
    "timestamp": "2024-11-10T15:05:00Z"
  }
}
```

**504 Gateway Timeout - AI API Timeout**
```json
{
  "error": "api_timeout",
  "message": "The AI service took too long to respond. Your message was saved; please try sending again.",
  "details": {
    "timeout_seconds": 30,
    "chat_type": "main",
    "timestamp": "2024-11-10T15:05:00Z"
  }
}
```

---

## 5. Data Flow

### High-Level Flow

```
Client Request
    ↓
[1] Validate Path Params (sessionId UUID)
    ↓
[2] Validate Request Body (chat_type, content, client_message_id)
    ↓
[3] Check Session Exists and Not Completed
    ↓
[4] Check Idempotency (client_message_id exists?)
    ├─ Yes → Return Existing Messages (200 OK)
    └─ No  → Continue
        ↓
[5] Save User Message to Database
    ↓
[6] Prepare AI Prompt (load scenario, history)
    ↓
[7] Call Claude API (with retries)
    ↓
[8] Parse AI Response for Completion Flag
    ↓
[9] Save AI Message to Database
    ↓
[10] Complete Session (if flag detected)
    ↓
[11] Return MessageResponseDTO (200 OK)
```

### Detailed Flow

#### Phase 1: Request Validation

1. **Extract and Validate Path Parameters**
   - Parse `sessionId` from URL
   - Validate UUID format using Zod schema
   - Return 400 if invalid

2. **Parse and Validate Request Body**
   - Parse JSON body
   - Validate against `SendMessageBodySchema`
   - Check `chat_type` is 'main' or 'helper'
   - Check `content` is non-empty and <= 8000 chars
   - Check `client_message_id` is valid UUID if provided
   - Return 400 if validation fails

#### Phase 2: Session Verification

3. **Query Session from Database**
   ```sql
   SELECT id, is_completed, completed_at, scenario_id, message_count_main, message_count_helper
   FROM sessions
   WHERE id = $1;
   ```
   - Return 404 if session not found
   - Return 409 if `is_completed = true`
   - Continue if session valid and incomplete

#### Phase 3: Idempotency Check

4. **Check for Existing Message with client_message_id**
   ```sql
   SELECT m1.id, m1.role, m1.chat_type, m1.content, m1.sent_at,
          m2.id, m2.role, m2.chat_type, m2.content, m2.sent_at
   FROM messages m1
   LEFT JOIN messages m2 ON m2.session_id = m1.session_id
                         AND m2.sent_at > m1.sent_at
                         AND m2.role != 'user'
   WHERE m1.session_id = $1
     AND m1.client_message_id = $2
   ORDER BY m2.sent_at ASC
   LIMIT 1;
   ```
   - If found: Return existing messages (200 OK) - no new API call
   - If not found: Continue with new message processing

#### Phase 4: User Message Persistence

5. **Insert User Message**
   ```sql
   INSERT INTO messages (session_id, user_id, role, chat_type, content, client_message_id)
   VALUES ($1, NULL, 'user', $2, $3, $4)
   RETURNING id, role, chat_type, content, sent_at;
   ```
   - Database trigger automatically increments `message_count_main` or `message_count_helper`
   - Database trigger updates `last_activity_at = NOW()`
   - Return 500 if database error

6. **Log Event: Message Received**
   ```sql
   INSERT INTO logs (level, event_type, session_id, metadata)
   VALUES ('info', 'message_received', $1, jsonb_build_object(
     'chat_type', $2,
     'message_id', $3,
     'content_length', $4
   ));
   ```

#### Phase 5: AI Prompt Preparation

7. **Load Scenario Prompt Template**
   - Read `.md` file from `prompts/scenarios/{scenario_name}.md` or `prompts/helper-base.md`
   - Parse template with placeholders
   - Include scenario context, objectives, completion criteria

8. **Fetch Conversation History**
   - Main chat: Last 20 messages from session
   - Helper chat: Last 10 from main + last 5 from helper
   ```sql
   SELECT role, content
   FROM messages
   WHERE session_id = $1
     AND chat_type = $2
   ORDER BY sent_at DESC
   LIMIT 20;
   ```

9. **Construct Claude API Prompt**
   - System message: Scenario/helper personality + instructions
   - Message history: Transform to Claude format (user/assistant roles)
   - Current user message: Include as latest message
   - Total token estimate: < 4000 for main, < 2000 for helper

#### Phase 6: Claude API Integration

10. **Call Claude API (with Retry Logic)**
    - Endpoint: `https://api.anthropic.com/v1/messages`
    - Headers: `x-api-key`, `anthropic-version: 2023-06-01`
    - Model: `claude-4.5-haiku`
    - Temperature: 0.9 (main), 0.7 (helper)
    - Max tokens: 2000 (main), 1000 (helper)
    - Timeout: 30s (main), 20s (helper)
    - Retry: 3 attempts with exponential backoff (1s, 2s, 4s)

11. **Handle API Response**
    - Parse complete response
    - Extract text content from response
    - Return 504 if timeout exceeded
    - Return 500 if all retries fail

12. **Log API Call**
    ```sql
    INSERT INTO logs (level, event_type, session_id, metadata)
    VALUES ('info', 'api_call_completed', $1, jsonb_build_object(
      'chat_type', $2,
      'duration_ms', $3,
      'input_tokens', $4,
      'output_tokens', $5
    ));
    ```

#### Phase 7: Response Processing

13. **Parse Completion Flag (Main Chat Only)**
    - Search for `[SCENARIO_COMPLETE]` in AI response
    - Or check if `message_count_main >= 30` (hard cap)
    - Set `completion_flag_detected = true` if found
    - Remove flag from displayed content

14. **Save AI Assistant Message**
    ```sql
    INSERT INTO messages (session_id, user_id, role, chat_type, content)
    VALUES ($1, NULL, $2, $3, $4)
    RETURNING id, role, chat_type, content, sent_at;
    ```
    - `role = 'main_assistant'` or `'helper_assistant'` based on chat_type
    - Return 500 if database error

#### Phase 8: Session Completion (Conditional)

15. **Complete Session (if flag detected)**
    ```sql
    UPDATE sessions
    SET is_completed = true,
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE id = $1
    RETURNING id, is_completed, completed_at, duration_seconds, message_count_main, message_count_helper;
    ```

16. **Log Completion Event**
    ```sql
    INSERT INTO logs (level, event_type, session_id, metadata)
    VALUES ('info', 'scenario_completed', $1, jsonb_build_object(
      'duration_seconds', $2,
      'message_count_main', $3,
      'message_count_helper', $4
    ));
    ```

#### Phase 9: Response Construction

17. **Build MessageResponseDTO**
    - Include user_message (from step 5)
    - Include assistant_message (from step 14)
    - Set session_complete and completion_flag_detected
    - Include session completion data if applicable
    - Return 200 OK

---

## 6. Security Considerations

### Input Validation

**Path Parameters:**
- Validate `sessionId` is valid UUID format
- Prevent SQL injection via parameterized queries

**Request Body:**
- Validate `chat_type` against strict enum
- Validate `content` length to prevent DoS (max 8000 chars)
- Validate `client_message_id` is valid UUID if provided
- Sanitize input at database level (use parameterized queries)

**Content Filtering:**
- Do NOT filter or sanitize message content before storage (preserve user input)
- XSS prevention handled at UI rendering layer (React escapes by default)
- Allow Claude API to handle content moderation

### Data Privacy

**Logging Restrictions:**
- NEVER log message content (privacy violation)
- Log only metadata: message IDs, counts, timestamps, durations
- Log error details without sensitive information

**Database Security:**
- Use parameterized queries (prevent SQL injection)
- Row-level security policies (deferred with authentication)
- Message immutability enforced by database trigger

### API Security

**Claude API Key:**
- Store in environment variable (`import.meta.env.ANTHROPIC_API_KEY`)
- Never expose in client-side code
- Never log API key

**Rate Limiting:**
- Handle Anthropic rate limits (429 responses)
- Implement exponential backoff for retries
- Consider user-level rate limiting (future, with auth)

**Session Validation:**
- Always verify session exists before operations
- Always verify session not completed
- Prevent unauthorized session access (deferred with auth)

### Error Handling Security

**Error Messages:**
- Use generic messages for production
- Don't expose internal implementation details
- Don't leak database schema information
- Maintain helper personality voice for user-facing errors

**Stack Traces:**
- Never expose stack traces to client
- Log detailed errors server-side only
- Return generic 500 errors with safe messages

---

## 7. Error Handling

### Client-Side Errors (4xx)

**400 Bad Request - Validation Errors**
- **Trigger:** Invalid chat_type, empty content, content > 8000 chars, invalid UUID
- **Response:** Detailed validation errors in `details` object
- **Retry:** Client should fix input and retry
- **Logging:** Log as `warning` with validation details (no content)

**404 Not Found - Session Not Found**
- **Trigger:** Session doesn't exist in database
- **Response:** Generic not found message
- **Retry:** Client should not retry; redirect to session creation
- **Logging:** Log as `warning` with attempted session_id

**409 Conflict - Session Completed**
- **Trigger:** `is_completed = true` for session
- **Response:** Include completion timestamp in details
- **Retry:** Client should not retry; display completion UI
- **Logging:** Log as `info` with session_id and completed_at

**413 Payload Too Large**
- **Trigger:** Content length > 8000 characters
- **Response:** Include max and provided lengths
- **Retry:** Client should truncate and retry
- **Logging:** Log as `warning` with content length (not content)

### Server-Side Errors (5xx)

**500 Internal Server Error - Database Error**
- **Trigger:** Database connection failure, query error, constraint violation
- **Response:** Generic error message, preserve user message
- **Retry:** Client can retry (user message already saved)
- **Logging:** Log as `error` with full error context

**500 Internal Server Error - AI API Failure**
- **Trigger:** All 3 retry attempts failed, network errors, API errors
- **Response:** Indicate retries exhausted, user message preserved
- **Retry:** Client can retry (idempotent)
- **Logging:** Log as `error` with retry count and error details

**504 Gateway Timeout - AI API Timeout**
- **Trigger:** AI response exceeds timeout (30s main, 20s helper)
- **Response:** Indicate timeout, user message preserved
- **Retry:** Client can retry (idempotent)
- **Logging:** Log as `error` with timeout duration and chat_type

### Retry Strategy

**Exponential Backoff for Claude API:**
```typescript
const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await callClaudeAPI(prompt);
    return response;
  } catch (error) {
    if (attempt < 2) {
      await sleep(retryDelays[attempt]);
    } else {
      throw error; // All retries exhausted
    }
  }
}
```

**Rate Limiting (429 from Anthropic):**
- Extract `retry-after` header if present
- Wait specified duration before retry
- If no header, use exponential backoff
- If still failing after retries, return 503 Service Unavailable

**Network Errors:**
- Retry on connection errors (ECONNREFUSED, ETIMEDOUT)
- Don't retry on 4xx client errors (except 429)
- Retry on 5xx server errors

### Error Recovery

**User Message Preservation:**
- User message saved BEFORE calling Claude API
- On API failure, message persists in database
- Client can retry with same `client_message_id` (idempotent)
- No duplicate user messages created

**Partial State Handling:**
- If user message saved but AI call fails: Return 500, user message preserved
- If AI call succeeds but save fails: Log error, retry save, return 500 if retry fails
- If session completion fails: Log error, messages still saved

**Logging for Debugging:**
- All errors logged with context (session_id, chat_type, error type)
- API failures logged with retry count and error message
- Database errors logged with query context (not full query)

---

## 8. Performance Considerations

### Response Time Targets

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Total endpoint response | < 8s | 15s | Includes full Claude API round-trip |
| Database queries | < 100ms | 500ms | Session + message queries combined |
| Claude API call | < 5s | 30s (main), 20s (helper) | Network + AI generation |
| Message persistence | < 50ms | 200ms | Two INSERT operations |

### Database Optimization

**Indexes Used:**
- `idx_sessions_active_per_user` - Fast session lookup (deferred with auth)
- `idx_messages_session_time_id` - Message history retrieval
- `idx_messages_idempotency` - Idempotency check
- `idx_messages_user_id` - RLS optimization (deferred with auth)

**Query Optimization:**
- Use `SELECT` with specific columns (avoid `SELECT *`)
- Limit message history queries (last 20 for main, 15 for helper)
- Single transaction for message inserts (user + assistant)
- Parameterized queries (use query plan caching)

**Connection Pooling:**
- Supabase connection pooler (PgBouncer)
- Transaction mode (max 15 connections)
- Reuse connections across requests

### Claude API Optimization

**Prompt Size Management:**
- Limit conversation history to prevent excessive tokens
- Main: System + history < 4000 tokens (~3000 words)
- Helper: System + history < 2000 tokens (~1500 words)
- Truncate older messages if needed

**Timeout Configuration:**
- Main chat: 30s timeout (longer responses expected)
- Helper chat: 20s timeout (shorter responses expected)
- Fail fast on timeouts (don't retry timeout errors)

**Model Selection:**
- Use `claude-4.5-haiku` (fast, cost-effective)
- Don't use larger models (unnecessary for MVP)

### Memory Management

**Prompt Template Caching:**
- Load prompt templates once at startup
- Cache in memory (not re-read from disk per request)
- Invalidate cache on template file changes

**Message History Caching:**
- Don't cache (session state changes frequently)
- Fresh query for each request ensures consistency

### Monitoring and Profiling

**Metrics to Track:**
- API response time (p50, p95, p99)
- Claude API call duration
- Database query duration
- Error rate by type (4xx vs 5xx)
- Retry frequency
- Message count per session

**Logging for Performance:**
- Log slow queries (> 500ms)
- Log slow API calls (> 10s)
- Log request duration in milliseconds
- Include timing breakdown in logs

---

## 9. Implementation Steps

### Step 1: Create Validation Schemas

**File:** `src/lib/validation/messages.ts`

1. Create Zod schemas for path parameters and request body
2. Export `SendMessageParamsSchema` and `SendMessageBodySchema`
3. Export TypeScript types inferred from schemas

**Code:**
```typescript
import { z } from 'zod';

export const SendMessageParamsSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid session ID format' }),
});

export const SendMessageBodySchema = z.object({
  chat_type: z.enum(['main', 'helper'], {
    errorMap: () => ({ message: "chat_type must be 'main' or 'helper'" }),
  }),
  content: z
    .string()
    .min(1, { message: 'content cannot be empty' })
    .max(8000, { message: 'content cannot exceed 8000 characters' }),
  client_message_id: z
    .string()
    .uuid({ message: 'client_message_id must be a valid UUID' })
    .optional(),
});

export type SendMessageParams = z.infer<typeof SendMessageParamsSchema>;
export type SendMessageBody = z.infer<typeof SendMessageBodySchema>;
```

### Step 2: Create Claude API Service

**File:** `src/lib/services/claude-api.service.ts`

1. Create service class with methods for API calls
2. Implement retry logic with exponential backoff
3. Handle timeouts and errors
4. Load API key from environment variables
5. Export `ClaudeAPIService` class

**Methods:**
- `constructor()` - Initialize with API key
- `callAPI(prompt, chatType)` - Main API call with retries
- `prepareRequest(prompt, chatType)` - Build API request
- `parseResponse(response)` - Extract text from response
- `detectCompletionFlag(content)` - Check for scenario completion
- `sleep(ms)` - Helper for delays

**Configuration:**
```typescript
const CLAUDE_CONFIG = {
  model: 'claude-4.5-haiku',
  apiVersion: '2023-06-01',
  main: {
    temperature: 0.9,
    maxTokens: 2000,
    timeout: 30000, // 30s
  },
  helper: {
    temperature: 0.7,
    maxTokens: 1000,
    timeout: 20000, // 20s
  },
  retry: {
    attempts: 3,
    delays: [1000, 2000, 4000], // 1s, 2s, 4s
  },
};
```

### Step 3: Create Prompt Service

**File:** `src/lib/services/prompt.service.ts`

1. Create service for loading and managing prompt templates
2. Load prompt files from disk at startup
3. Cache templates in memory
4. Provide methods to build prompts with context

**Methods:**
- `loadTemplates()` - Load all .md files at startup
- `getScenarioPrompt(scenarioId, messageHistory, currentMessage)` - Build main chat prompt
- `getHelperPrompt(messageHistory, currentMessage)` - Build helper chat prompt
- `formatMessageHistory(messages)` - Convert to Claude format

**Prompt Files:**
- `prompts/scenarios/marketplace.md`
- `prompts/scenarios/party.md`
- `prompts/scenarios/kebab.md`
- `prompts/helper-base.md`

### Step 4: Create Messages Service

**File:** `src/lib/services/messages.service.ts`

1. Create service class for message business logic
2. Implement all message operations (save, retrieve, check idempotency)
3. Use Supabase client from dependency injection
4. Handle database errors and edge cases

**Methods:**
- `checkIdempotency(sessionId, clientMessageId)` - Check for existing messages
- `saveUserMessage(sessionId, chatType, content, clientMessageId)` - Insert user message
- `saveAssistantMessage(sessionId, chatType, role, content)` - Insert AI message
- `getMessageHistory(sessionId, chatType, limit)` - Fetch conversation history
- `buildMessageResponseDTO(userMsg, assistantMsg, sessionComplete, completionDetected, sessionData?)` - Construct response

### Step 5: Create Sessions Service (Extend or Create)

**File:** `src/lib/services/sessions.service.ts`

1. Create or extend service for session operations
2. Implement session validation and completion logic

**Methods:**
- `getSession(sessionId)` - Fetch session by ID
- `validateSessionActive(session)` - Check not completed
- `completeSession(sessionId)` - Mark session completed
- `getScenarioIdForSession(sessionId)` - Fetch scenario ID

### Step 6: Create Logging Service

**File:** `src/lib/services/logging.service.ts`

1. Create service for structured logging to database
2. Provide methods for different log levels and event types
3. Ensure no message content is logged

**Methods:**
- `logInfo(eventType, sessionId, metadata)` - Info level logs
- `logWarning(eventType, sessionId, metadata)` - Warning level logs
- `logError(eventType, sessionId, metadata)` - Error level logs
- `logAPICall(sessionId, chatType, duration, tokens)` - API call logs

### Step 7: Create Error Response Helpers

**File:** `src/lib/utils/error-responses.ts`

1. Create helper functions to build consistent error responses
2. Use `ApiErrorDTO` type from `src/types.ts`

**Functions:**
```typescript
export function validationError(message: string, details?: Record<string, unknown>): ApiErrorDTO;
export function notFoundError(resource: string, id: string): ApiErrorDTO;
export function conflictError(message: string, details?: Record<string, unknown>): ApiErrorDTO;
export function databaseError(): ApiErrorDTO;
export function apiFailureError(retryCount: number, lastError: string): ApiErrorDTO;
export function apiTimeoutError(timeoutSeconds: number, chatType: string): ApiErrorDTO;
```

### Step 8: Implement API Route Handler

**File:** `src/pages/api/sessions/[sessionId]/messages.ts`

1. Create Astro API route file
2. Set `export const prerender = false`
3. Implement `POST` handler function
4. Use services for business logic (keep route handler thin)

**Handler Structure:**
```typescript
export const prerender = false;

export async function POST(context: APIContext) {
  // 1. Extract Supabase client from context.locals
  const supabase = context.locals.supabase;
  
  // 2. Validate path parameters
  const paramsResult = SendMessageParamsSchema.safeParse(context.params);
  if (!paramsResult.success) {
    return new Response(JSON.stringify(validationError(...)), { status: 400 });
  }
  
  // 3. Parse and validate request body
  const bodyResult = await parseAndValidateBody(context.request);
  if (!bodyResult.success) {
    return new Response(JSON.stringify(validationError(...)), { status: 400 });
  }
  
  // 4. Check session exists and not completed
  const session = await sessionsService.getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify(notFoundError(...)), { status: 404 });
  }
  if (session.is_completed) {
    return new Response(JSON.stringify(conflictError(...)), { status: 409 });
  }
  
  // 5. Check idempotency
  const existingMessages = await messagesService.checkIdempotency(...);
  if (existingMessages) {
    return new Response(JSON.stringify(existingMessages), { status: 200 });
  }
  
  // 6. Save user message
  const userMessage = await messagesService.saveUserMessage(...);
  
  // 7. Prepare AI prompt
  const messageHistory = await messagesService.getMessageHistory(...);
  const prompt = await promptService.getPrompt(...);
  
  // 8. Call Claude API
  try {
    const aiResponse = await claudeAPIService.callAPI(prompt, chatType);
    
    // 9. Parse completion flag
    const completionDetected = claudeAPIService.detectCompletionFlag(aiResponse);
    
    // 10. Save AI message
    const assistantMessage = await messagesService.saveAssistantMessage(...);
    
    // 11. Complete session if needed
    let sessionData = null;
    if (completionDetected) {
      sessionData = await sessionsService.completeSession(sessionId);
    }
    
    // 12. Build and return response
    const response = messagesService.buildMessageResponseDTO(...);
    return new Response(JSON.stringify(response), { status: 200 });
    
  } catch (error) {
    // Handle errors (timeout, API failure, database error)
    return handleError(error);
  }
}
```

### Step 9: Create Prompt Template Files

**Files:**
- `prompts/scenarios/marketplace.md`
- `prompts/scenarios/party.md`
- `prompts/scenarios/kebab.md`
- `prompts/helper-base.md`

1. Write scenario-specific prompts in Markdown
2. Include system instructions, objectives, completion criteria
3. Add example exchanges (3-5 per scenario)
4. Define completion flag format: `[SCENARIO_COMPLETE]`

**Template Structure:**
```markdown
# System Instruction
You are a German market vendor in a bustling marketplace...

# Scenario Context
The user is practicing German conversation at B1-B2 level...

# Objectives
- Help user practice common marketplace vocabulary
- Guide conversation to natural conclusion after 15-25 exchanges
- Maintain friendly, patient demeanor

# Completion Criteria
- User successfully completes a purchase transaction
- Conversation reaches 20+ exchanges
- User expresses satisfaction/goodbye

When scenario is complete, include [SCENARIO_COMPLETE] at end of your response.

# Example Exchanges
User: Guten Tag! Ich suche frisches Gemüse.
Assistant: Natürlich! Wir haben heute frische Tomaten, Gurken und Paprika.

[Additional examples...]
```

### Step 10: Add Environment Variables

**File:** `.env` (local), deployment environment (production)

1. Add `ANTHROPIC_API_KEY` variable
2. Update `src/env.d.ts` with type definition

**Type Definition:**
```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly ANTHROPIC_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Step 11: Test Error Scenarios

1. **Test Invalid Input:**
   - Invalid UUID format
   - Empty content
   - Content > 8000 chars
   - Invalid chat_type
   - Verify 400 responses

2. **Test Session States:**
   - Non-existent session (404)
   - Completed session (409)
   - Valid active session (200)

3. **Test Idempotency:**
   - Send same client_message_id twice
   - Verify no duplicate messages created
   - Verify same response returned

4. **Test AI Integration:**
   - Main chat message (German response)
   - Helper chat message (English response)
   - Completion flag detection
   - Session auto-completion

5. **Test Error Handling:**
   - Database connection failure
   - Claude API timeout
   - Claude API failure
   - Network errors

### Step 12: Add Logging

1. Log all request starts with metadata
2. Log all successful completions with timing
3. Log all errors with context (no content)
4. Log API calls with duration and token usage

**Logging Points:**
- Request received
- Validation failed
- Session not found
- Idempotency hit
- User message saved
- API call started
- API call completed/failed
- Session completed
- Response sent

### Step 13: Performance Testing

1. **Measure Response Times:**
   - Run load tests with multiple concurrent requests
   - Verify p95 < 10s, p99 < 15s
   - Identify bottlenecks (database, API, parsing)

2. **Optimize Queries:**
   - Review query execution plans
   - Ensure indexes are used
   - Consider query result caching (if applicable)

3. **Test Connection Pooling:**
   - Verify connections reused properly
   - Monitor connection pool exhaustion
   - Tune pool size if needed

4. **Test Claude API:**
   - Measure actual API response times
   - Test retry logic under failures
   - Verify timeout handling

### Step 14: Integration Testing

1. **Test Full Flow:**
   - Create session
   - Send multiple messages (main and helper)
   - Verify message counts update
   - Trigger session completion
   - Verify completion data correct

2. **Test Edge Cases:**
   - Rapid consecutive messages
   - Long messages (near 8000 char limit)
   - Many messages in session (25-30)
   - Switching between main and helper chats

3. **Test Error Recovery:**
   - Interrupt network during API call
   - Kill database connection mid-operation
   - Verify user message preserved
   - Verify retry succeeds

### Step 15: Documentation

1. **Update API Documentation:**
   - Add endpoint to API reference
   - Include request/response examples
   - Document error scenarios
   - Add usage notes

2. **Code Comments:**
   - Document complex logic
   - Explain retry strategy
   - Document completion detection
   - Add JSDoc for all exported functions

3. **README Updates:**
   - Add Claude API setup instructions
   - Document environment variables
   - Add prompt template guidelines
   - Include testing instructions

---

## 10. Testing Checklist

### Unit Tests

- [ ] Validation schemas (valid and invalid inputs)
- [ ] Prompt building (scenario and helper prompts)
- [ ] Completion flag detection (various formats)
- [ ] Error response builders
- [ ] Message history formatting

### Integration Tests

- [ ] Save and retrieve messages from database
- [ ] Session validation logic
- [ ] Idempotency check (same client_message_id)
- [ ] Session completion workflow
- [ ] Logging service (verify logs created)

### API Tests

- [ ] Valid POST request (main chat)
- [ ] Valid POST request (helper chat)
- [ ] Invalid session ID (400)
- [ ] Non-existent session (404)
- [ ] Completed session (409)
- [ ] Content too long (413)
- [ ] Idempotency test (duplicate client_message_id)
- [ ] Session completion flow

### Claude API Tests

- [ ] Successful API call (mock)
- [ ] API timeout (mock)
- [ ] API failure and retry (mock)
- [ ] Rate limiting handling (mock 429)
- [ ] Completion flag parsing

### Error Handling Tests

- [ ] Database connection failure
- [ ] Validation errors
- [ ] Claude API errors
- [ ] Timeout errors
- [ ] Network errors

### Performance Tests

- [ ] Response time < 10s under normal load
- [ ] Handle 10 concurrent requests
- [ ] Database query performance (< 100ms)
- [ ] Prompt building performance (< 50ms)

---

## 11. Monitoring and Alerts

### Metrics to Monitor

1. **Request Metrics:**
   - Total requests per minute
   - Success rate (200 responses)
   - Error rate (4xx and 5xx)
   - Response time (p50, p95, p99)

2. **Claude API Metrics:**
   - API call count
   - API call duration
   - API failure rate
   - API timeout rate
   - Retry frequency
   - Token usage (input/output)

3. **Business Metrics:**
   - Messages sent per session
   - Session completion rate
   - Main vs helper chat ratio
   - Average session duration

### Alerts to Configure

1. **High Error Rate:**
   - Alert if 5xx error rate > 5% for 5 minutes
   - Alert if 4xx error rate > 20% for 5 minutes

2. **Performance Degradation:**
   - Alert if p95 response time > 15s for 5 minutes
   - Alert if p99 response time > 30s

3. **Claude API Issues:**
   - Alert if API failure rate > 10% for 5 minutes
   - Alert if API timeout rate > 5% for 5 minutes

4. **Database Issues:**
   - Alert if database query time > 1s
   - Alert if connection pool exhausted

---

## 12. Future Enhancements

### Server-Side Streaming (Post-MVP)

1. Replace standard Claude API calls with streaming API
2. Implement Server-Sent Events (SSE) in Astro
3. Stream AI response character-by-character to client
4. Save complete message after streaming completes
5. Handle stream interruptions gracefully

### Authentication Integration

1. Extract user_id from auth session
2. Populate user_id in messages table
3. Enforce RLS policies for session access
4. Track user-specific metrics and limits

### Rate Limiting

1. Implement user-level rate limiting (weekly scenarios)
2. Check completion count before allowing new messages
3. Return 429 if user exceeds limits
4. Reset counters weekly (Monday 00:00 UTC)

### Caching

1. Cache prompt templates (already in plan)
2. Cache scenario data (rarely changes)
3. Consider Redis for session state (if needed)
4. Implement HTTP caching headers (ETag, Cache-Control)

### Advanced Error Handling

1. Implement circuit breaker for Claude API
2. Fallback to cached responses (if applicable)
3. Queue failed messages for retry (background job)
4. Implement dead letter queue for persistent failures

---

## 13. Appendix

### Related Documentation

- **API Plan:** `.ai/api-plan.md`
- **Database Plan:** `.ai/db-plan.md`
- **Tech Stack:** `.ai/tech-stack.md`
- **GET Messages Endpoint:** `.ai/api_implementation_details/messages-list-implementation-plan.md`
- **Session Endpoints:** `.ai/api_implementation_details/session-implementation-plan.md`

### Dependencies

- `@anthropic-ai/sdk` - Claude API client
- `zod` - Input validation
- `@supabase/supabase-js` - Database client
- Astro 5 - Web framework
- TypeScript 5 - Type safety

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://....supabase.co
SUPABASE_KEY=eyJ...
```

### Database Tables Used

- `sessions` - Session state and completion
- `messages` - Message storage (immutable)
- `scenarios` - Scenario configuration
- `logs` - Operational logging

### Key Constraints

- Max message content: 8000 characters
- Max conversation history: 20 messages (main), 15 messages (helper)
- API timeout: 30s (main), 20s (helper)
- Retry attempts: 3 with exponential backoff
- Single active session per user (enforced by database)
- Messages immutable after creation (enforced by trigger)

