# API Endpoint Implementation Plan: Get Session Messages

## 1. Endpoint Overview

**Purpose:** Retrieve all messages for a specific session with support for filtering, pagination, and sorting. This endpoint enables the frontend to load conversation history for session restoration, replay, or display purposes.

**Key Features:**
- Retrieve messages for a specific session by session ID
- Filter messages by chat type (main, helper, or all)
- Paginated results with configurable limit and offset
- Sortable by timestamp (ascending or descending)
- Returns pagination metadata for client-side pagination UI
- Public access (no authentication required in MVP)

**Use Cases:**
- Loading conversation history when user returns to an active session
- Displaying message history for completed sessions
- Separate loading of main and helper chat messages
- Implementing infinite scroll or pagination in the UI

---

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/sessions/:sessionId/messages
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | UUID | Yes | Unique identifier of the session |

### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `chat_type` | string | No | `all` | Must be 'main', 'helper', or 'all' | Filter messages by chat panel |
| `limit` | integer | No | `100` | Must be 1-500 | Number of messages to return |
| `offset` | integer | No | `0` | Must be >= 0 | Number of messages to skip (for pagination) |
| `order` | string | No | `asc` | Must be 'asc' or 'desc' | Sort order by sent_at timestamp |

### Request Headers
```
Content-Type: application/json
```

### Example Requests

**Basic request (all messages, default pagination):**
```
GET /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages
```

**Filter main chat only, descending order:**
```
GET /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages?chat_type=main&order=desc
```

**Paginated request (second page):**
```
GET /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages?limit=50&offset=50
```

---

## 3. Used Types

### Response DTOs

**MessageWithSessionDTO** (from `src/types.ts`)
```typescript
type MessageWithSessionDTO = MessageDTO & {
  session_id: string;
};

// Where MessageDTO is:
type MessageDTO = Pick<Tables<"messages">, "id" | "role" | "chat_type" | "content" | "sent_at">;
```

**MessagesListResponseDTO** (from `src/types.ts`)
```typescript
interface MessagesListResponseDTO {
  messages: MessageWithSessionDTO[];
  pagination: PaginationDTO;
}
```

**PaginationDTO** (from `src/types.ts`)
```typescript
interface PaginationDTO {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}
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

### Validation Schemas (to be created)

**Query Parameters Schema:**
```typescript
import { z } from 'zod';

const GetMessagesQuerySchema = z.object({
  chat_type: z.enum(['main', 'helper', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.enum(['asc', 'desc']).default('asc'),
});

type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;
```

---

## 4. Response Details

### Success Response (200 OK)

**Structure:**
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Du stehst auf einem belebten Wochenmarkt...",
      "sent_at": "2024-11-10T14:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "user",
      "chat_type": "main",
      "content": "Guten Tag! Ich suche frisches Gemüse.",
      "sent_at": "2024-11-10T14:01:00Z"
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

### Error Responses

**400 Bad Request - Invalid Query Parameters**
```json
{
  "error": "validation_error",
  "message": "Invalid query parameters provided.",
  "details": {
    "chat_type": "Must be 'main', 'helper', or 'all'",
    "limit": "Must be between 1 and 500"
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
  "message": "Session not found. Perhaps it wandered off?",
  "details": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**500 Internal Server Error - Database Error**
```json
{
  "error": "database_error",
  "message": "Database connection failed. How inconvenient. Please try again.",
  "details": {
    "timestamp": "2024-11-10T15:00:00Z"
  }
}
```

---

## 5. Data Flow

### Flow Diagram

```
Client Request
    ↓
[1] Astro API Route Handler
    ↓
[2] Extract & Validate Query Parameters (Zod)
    ↓
[3] Validate Session ID UUID Format
    ↓
[4] Get Supabase Client from context.locals
    ↓
[5] Call MessagesService.getSessionMessages()
    ↓
    ├──→ [6] Check Session Exists
    │         ↓ (if not found)
    │      Return 404 Error
    │
    ├──→ [7] Build Query with Filters
    │         - chat_type filter (if not 'all')
    │         - order by sent_at
    │         - limit and offset
    │
    ├──→ [8] Execute Query for Messages
    │
    ├──→ [9] Execute Count Query for Total
    │
    └──→ [10] Build Response Object
            - Transform to MessageWithSessionDTO[]
            - Calculate pagination metadata
            - Determine has_more flag
    ↓
[11] Return 200 OK with MessagesListResponseDTO
    ↓
Client Receives Response
```

### Detailed Steps

**Step 1: Astro API Route Handler**
- File: `src/pages/api/sessions/[sessionId]/messages.ts`
- Export `GET` handler function
- Extract `sessionId` from `Astro.params`
- Extract query parameters from `Astro.url.searchParams`

**Step 2: Validate Query Parameters**
- Use Zod schema to validate and transform query parameters
- Apply defaults (chat_type: 'all', limit: 100, offset: 0, order: 'asc')
- Return 400 if validation fails with detailed error messages

**Step 3: Validate Session ID**
- Check if sessionId matches UUID format
- Return 400 if invalid format

**Step 4: Get Supabase Client**
- Access `context.locals.supabase` (set by middleware)
- Use this client for all database operations

**Step 5: Call Service Layer**
- Import and call `MessagesService.getSessionMessages()`
- Pass supabase client, sessionId, and validated query parameters

**Step 6: Check Session Exists**
- Query: `SELECT id FROM sessions WHERE id = $1`
- If no result, throw NotFoundError
- Return early from service with 404

**Step 7: Build Query with Filters**
- Start with base query: `SELECT id, session_id, role, chat_type, content, sent_at FROM messages WHERE session_id = $1`
- Add chat_type filter if not 'all': `AND chat_type = $2`
- Add order: `ORDER BY sent_at ${order}, id ${order}` (id for stable sort)
- Add pagination: `LIMIT $n OFFSET $m`

**Step 8: Execute Message Query**
- Use Supabase client to execute query
- Handle database errors gracefully

**Step 9: Execute Count Query**
- Query total count with same filters: `SELECT COUNT(*) FROM messages WHERE session_id = $1 [AND chat_type = $2]`
- This provides accurate pagination metadata

**Step 10: Build Response Object**
- Map database rows to MessageWithSessionDTO
- Calculate `has_more`: `offset + messages.length < total`
- Construct PaginationDTO object
- Construct MessagesListResponseDTO

**Step 11: Return Response**
- Return 200 OK with MessagesListResponseDTO JSON
- Set appropriate Content-Type header

### Database Queries

**Session Existence Check:**
```sql
SELECT id FROM sessions WHERE id = $1;
```

**Messages Retrieval (all chats):**
```sql
SELECT id, session_id, role, chat_type, content, sent_at 
FROM messages 
WHERE session_id = $1 
ORDER BY sent_at ASC, id ASC 
LIMIT $2 OFFSET $3;
```

**Messages Retrieval (specific chat):**
```sql
SELECT id, session_id, role, chat_type, content, sent_at 
FROM messages 
WHERE session_id = $1 AND chat_type = $2 
ORDER BY sent_at ASC, id ASC 
LIMIT $3 OFFSET $4;
```

**Total Count (all chats):**
```sql
SELECT COUNT(*) as total 
FROM messages 
WHERE session_id = $1;
```

**Total Count (specific chat):**
```sql
SELECT COUNT(*) as total 
FROM messages 
WHERE session_id = $1 AND chat_type = $2;
```

### Indexes Used
- `idx_messages_session_time_id` on `(session_id, sent_at, id)` - Optimizes message retrieval with stable pagination
- `idx_messages_chat_type` on `(session_id, chat_type, sent_at)` - Optimizes filtered queries

---

## 6. Security Considerations

### Current Security Posture (MVP)

**No Authentication:** 
- All sessions are publicly accessible
- No user context validation required
- Authentication/authorization deferred to future implementation

**Input Validation:**
- Strict validation of all query parameters using Zod
- UUID format validation for sessionId
- Enum validation for chat_type and order
- Range validation for limit (1-500) and offset (>=0)

**SQL Injection Prevention:**
- Use Supabase client with parameterized queries
- Never concatenate user input into SQL strings
- All values passed as query parameters

**DoS/Abuse Prevention:**
- Maximum limit enforced at 500 messages per request
- Offset validation prevents negative values
- No rate limiting in MVP (can be added later)

**Data Privacy:**
- Message content returned as-is (no PII filtering in MVP)
- Message content never logged (privacy constraint from API plan)
- Only metadata logged (session_id, counts, filters)

### Future Security Enhancements (Post-Auth Implementation)

**Authentication:**
- Verify user owns the session before returning messages
- Implement Row Level Security (RLS) policies
- Return 401 for unauthenticated requests
- Return 403 for unauthorized access

**Rate Limiting:**
- Implement per-user rate limiting
- Prevent abuse of pagination endpoints

**Content Filtering:**
- Consider PII redaction for logged-out users
- Implement content moderation flags

---

## 7. Error Handling

### Error Scenarios and Responses

#### 1. Invalid Query Parameters (400 Bad Request)

**Trigger:**
- `chat_type` not in ['main', 'helper', 'all']
- `limit` < 1 or > 500
- `offset` < 0
- `order` not in ['asc', 'desc']
- Non-numeric values for limit/offset

**Response:**
```typescript
{
  error: "validation_error",
  message: "Invalid query parameters provided.",
  details: {
    // Field-specific errors from Zod validation
  }
}
```

**Implementation:**
```typescript
try {
  const query = GetMessagesQuerySchema.parse(searchParams);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(JSON.stringify({
      error: "validation_error",
      message: "Invalid query parameters provided.",
      details: error.flatten().fieldErrors
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
```

#### 2. Invalid Session ID Format (400 Bad Request)

**Trigger:**
- sessionId is not a valid UUID format

**Response:**
```typescript
{
  error: "validation_error",
  message: "Invalid session ID format.",
  details: {
    sessionId: "Must be a valid UUID"
  }
}
```

**Implementation:**
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(sessionId)) {
  return new Response(JSON.stringify({
    error: "validation_error",
    message: "Invalid session ID format.",
    details: { sessionId: "Must be a valid UUID" }
  }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
}
```

#### 3. Session Not Found (404 Not Found)

**Trigger:**
- sessionId does not exist in the database

**Response:**
```typescript
{
  error: "not_found",
  message: "Session not found. Perhaps it wandered off?",
  details: {
    session_id: sessionId
  }
}
```

**Implementation:**
```typescript
// In service layer
const { data: session, error } = await supabase
  .from('sessions')
  .select('id')
  .eq('id', sessionId)
  .single();

if (!session) {
  throw new NotFoundError('Session not found. Perhaps it wandered off?', {
    session_id: sessionId
  });
}
```

#### 4. Database Connection Error (500 Internal Server Error)

**Trigger:**
- Supabase connection failure
- Network timeout
- Database unavailable

**Response:**
```typescript
{
  error: "database_error",
  message: "Database connection failed. How inconvenient. Please try again.",
  details: {
    timestamp: new Date().toISOString()
  }
}
```

**Implementation:**
```typescript
try {
  // Database operations
} catch (error) {
  console.error('Database error:', error);
  
  // Log to database (if connection available)
  await logError(supabase, 'database_error', sessionId, error);
  
  return new Response(JSON.stringify({
    error: "database_error",
    message: "Database connection failed. How inconvenient. Please try again.",
    details: { timestamp: new Date().toISOString() }
  }), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
}
```

#### 5. Unexpected Server Error (500 Internal Server Error)

**Trigger:**
- Unhandled exceptions
- Service layer errors
- Unexpected runtime errors

**Response:**
```typescript
{
  error: "internal_error",
  message: "An unexpected error occurred. The system has failed you.",
  details: {
    timestamp: new Date().toISOString()
  }
}
```

**Implementation:**
```typescript
try {
  // All endpoint logic
} catch (error) {
  console.error('Unexpected error:', error);
  
  return new Response(JSON.stringify({
    error: "internal_error",
    message: "An unexpected error occurred. The system has failed you.",
    details: { timestamp: new Date().toISOString() }
  }), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
}
```

### Error Logging Strategy

**What to Log:**
- Error type and message
- Session ID (if available)
- Request parameters (excluding sensitive data)
- Timestamp
- Error stack trace (for debugging)

**What NOT to Log:**
- Message content (privacy constraint)
- User PII (when auth implemented)

**Log Levels:**
- `warn` - Validation errors (400)
- `error` - Session not found (404)
- `error` - Database errors (500)
- `error` - Unexpected errors (500)

**Implementation:**
```typescript
// In service layer or utility
async function logError(
  supabase: SupabaseClient,
  eventType: string,
  sessionId: string | null,
  error: unknown
) {
  try {
    await supabase.from('logs').insert({
      level: 'error',
      event_type: eventType,
      session_id: sessionId,
      metadata: {
        error_message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}
```

---

## 8. Performance Considerations

### Expected Load
- Typical session has ~100 messages (main + helper combined)
- Most requests will use default pagination (100 messages)
- Some sessions may have up to 200+ messages
- Expected response time: < 1s (target), < 2s (max)

### Database Optimization

**Index Usage:**
- `idx_messages_session_time_id` on `(session_id, sent_at, id)`
  - Covers WHERE clause and ORDER BY
  - Enables efficient pagination
  - Stable sorting with id tiebreaker
  
- `idx_messages_chat_type` on `(session_id, chat_type, sent_at)`
  - Optimizes filtered queries (main/helper only)
  - Covers both WHERE and ORDER BY

**Query Optimization:**
- Use covering indexes to avoid table lookups
- Separate count query from message retrieval for accuracy
- Consider using window functions for count if performance is critical:
  ```sql
  SELECT *, COUNT(*) OVER() as total_count
  FROM messages
  WHERE session_id = $1
  ORDER BY sent_at ASC
  LIMIT $2 OFFSET $3;
  ```

### Potential Bottlenecks

**1. Large Offset Values**
- Problem: PostgreSQL must scan all skipped rows
- Impact: Performance degrades with large offsets (>1000)
- Mitigation: 
  - Document recommended pagination approach (cursor-based for future)
  - Most sessions have <200 messages, so offset <200 is acceptable
  - Consider cursor-based pagination in future iteration

**2. Count Query Performance**
- Problem: COUNT(*) requires full table scan
- Impact: Adds overhead to every request
- Mitigation:
  - Indexed columns make count faster
  - Consider caching count for completed sessions
  - For MVP, acceptable given small message counts

**3. Multiple Database Queries**
- Problem: Session existence check + messages query + count query = 3 queries
- Impact: Network latency accumulates
- Mitigation:
  - Use Supabase connection pooler (PgBouncer)
  - Consider combining session check with messages query
  - For MVP, acceptable given low traffic

### Caching Strategy (Future Enhancement)

**Completed Sessions:**
- Messages for completed sessions are immutable
- Consider caching entire response with Redis/CDN
- Cache key: `messages:${sessionId}:${chat_type}:${limit}:${offset}:${order}`
- TTL: Infinite (invalidate on session update, which won't happen)

**Active Sessions:**
- Don't cache active session messages (frequently changing)
- Fetch fresh data on every request

**Implementation Priority:**
- Defer caching to post-MVP
- Add when performance metrics indicate need

### Response Size Optimization

**Current Approach:**
- Return full message content (up to 8000 chars per message)
- With max 500 messages: ~4MB theoretical max
- Typical 100 messages: ~500KB average

**Future Optimizations:**
- Consider message content truncation for list views
- Implement lazy loading for message details
- Use compression (gzip) at HTTP level

---

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File:** `src/lib/validation/messages.validation.ts`

**Tasks:**
- Create Zod schema for query parameters
- Export schema and inferred type
- Add UUID validation helper

**Code:**
```typescript
import { z } from 'zod';

export const GetMessagesQuerySchema = z.object({
  chat_type: z.enum(['main', 'helper', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;

export const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};
```

### Step 2: Create Custom Error Classes
**File:** `src/lib/errors/index.ts`

**Tasks:**
- Create NotFoundError class
- Create ValidationError class
- Export error types

**Code:**
```typescript
export class NotFoundError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

### Step 3: Create Logging Utility
**File:** `src/lib/utils/logger.ts`

**Tasks:**
- Create logging functions for different levels
- Implement database logging via Supabase
- Ensure message content is never logged

**Code:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

type LogLevel = 'info' | 'warn' | 'error';

export async function logEvent(
  supabase: SupabaseClient,
  level: LogLevel,
  eventType: string,
  sessionId: string | null,
  metadata: Record<string, unknown>
) {
  try {
    await supabase.from('logs').insert({
      level,
      event_type: eventType,
      session_id: sessionId,
      user_id: null, // No auth in MVP
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

export async function logError(
  supabase: SupabaseClient,
  eventType: string,
  sessionId: string | null,
  error: unknown
) {
  await logEvent(supabase, 'error', eventType, sessionId, {
    error_message: error instanceof Error ? error.message : String(error),
  });
}
```

### Step 4: Create Messages Service
**File:** `src/lib/services/messages.service.ts`

**Tasks:**
- Create getSessionMessages function
- Implement session existence check
- Implement message retrieval with filters
- Implement count query
- Build pagination metadata
- Handle errors appropriately

**Code:**
```typescript
import type { SupabaseClient } from '@/db/supabase.client';
import type { 
  MessageWithSessionDTO, 
  MessagesListResponseDTO,
  PaginationDTO 
} from '@/types';
import type { GetMessagesQuery } from '@/lib/validation/messages.validation';
import { NotFoundError, DatabaseError } from '@/lib/errors';

export async function getSessionMessages(
  supabase: SupabaseClient,
  sessionId: string,
  query: GetMessagesQuery
): Promise<MessagesListResponseDTO> {
  // Step 1: Check if session exists
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new NotFoundError('Session not found. Perhaps it wandered off?', {
      session_id: sessionId,
    });
  }

  // Step 2: Build messages query
  let messagesQuery = supabase
    .from('messages')
    .select('id, session_id, role, chat_type, content, sent_at')
    .eq('session_id', sessionId);

  // Add chat_type filter if not 'all'
  if (query.chat_type !== 'all') {
    messagesQuery = messagesQuery.eq('chat_type', query.chat_type);
  }

  // Add ordering (by sent_at and id for stable sort)
  messagesQuery = messagesQuery.order('sent_at', { ascending: query.order === 'asc' })
    .order('id', { ascending: query.order === 'asc' });

  // Add pagination
  messagesQuery = messagesQuery.range(
    query.offset,
    query.offset + query.limit - 1
  );

  // Step 3: Execute messages query
  const { data: messages, error: messagesError } = await messagesQuery;

  if (messagesError) {
    throw new DatabaseError('Failed to retrieve messages.', {
      session_id: sessionId,
      error: messagesError.message,
    });
  }

  // Step 4: Get total count
  let countQuery = supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (query.chat_type !== 'all') {
    countQuery = countQuery.eq('chat_type', query.chat_type);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new DatabaseError('Failed to count messages.', {
      session_id: sessionId,
      error: countError.message,
    });
  }

  const total = count ?? 0;

  // Step 5: Build pagination metadata
  const pagination: PaginationDTO = {
    limit: query.limit,
    offset: query.offset,
    total,
    has_more: query.offset + messages.length < total,
  };

  // Step 6: Transform and return response
  const messagesWithSession: MessageWithSessionDTO[] = messages.map((msg) => ({
    id: msg.id,
    session_id: msg.session_id,
    role: msg.role,
    chat_type: msg.chat_type,
    content: msg.content,
    sent_at: msg.sent_at,
  }));

  return {
    messages: messagesWithSession,
    pagination,
  };
}
```

### Step 5: Create API Route Handler
**File:** `src/pages/api/sessions/[sessionId]/messages.ts`

**Tasks:**
- Export GET handler function with prerender disabled
- Extract and validate path parameters
- Extract and validate query parameters
- Call service layer
- Handle errors and return appropriate responses
- Log successful requests

**Code:**
```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getSessionMessages } from '@/lib/services/messages.service';
import { GetMessagesQuerySchema, isValidUUID } from '@/lib/validation/messages.validation';
import { NotFoundError, ValidationError, DatabaseError } from '@/lib/errors';
import { logEvent, logError } from '@/lib/utils/logger';
import type { ApiErrorDTO } from '@/types';

export const prerender = false;

export const GET: APIRoute = async ({ params, url, locals }) => {
  const sessionId = params.sessionId;
  const supabase = locals.supabase;

  try {
    // Step 1: Validate session ID format
    if (!sessionId || !isValidUUID(sessionId)) {
      const error: ApiErrorDTO = {
        error: 'validation_error',
        message: 'Invalid session ID format.',
        details: { sessionId: 'Must be a valid UUID' },
      };
      
      await logEvent(supabase, 'warn', 'validation_error', null, {
        endpoint: '/api/sessions/:sessionId/messages',
        error: 'Invalid session ID',
      });

      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Parse and validate query parameters
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;

    try {
      validatedQuery = GetMessagesQuerySchema.parse(searchParams);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        const error: ApiErrorDTO = {
          error: 'validation_error',
          message: 'Invalid query parameters provided.',
          details: zodError.flatten().fieldErrors,
        };

        await logEvent(supabase, 'warn', 'validation_error', sessionId, {
          endpoint: '/api/sessions/:sessionId/messages',
          errors: error.details,
        });

        return new Response(JSON.stringify(error), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Step 3: Call service layer
    const response = await getSessionMessages(supabase, sessionId, validatedQuery);

    // Step 4: Log successful request
    await logEvent(supabase, 'info', 'messages_retrieved', sessionId, {
      endpoint: '/api/sessions/:sessionId/messages',
      message_count: response.messages.length,
      chat_type: validatedQuery.chat_type,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    });

    // Step 5: Return success response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Handle specific error types
    if (error instanceof NotFoundError) {
      const errorResponse: ApiErrorDTO = {
        error: 'not_found',
        message: error.message,
        details: error.details,
      };

      await logError(supabase, 'session_not_found', sessionId, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error instanceof DatabaseError) {
      const errorResponse: ApiErrorDTO = {
        error: 'database_error',
        message: 'Database connection failed. How inconvenient. Please try again.',
        details: { timestamp: new Date().toISOString() },
      };

      await logError(supabase, 'database_error', sessionId, error);

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle unexpected errors
    console.error('Unexpected error in GET /api/sessions/:sessionId/messages:', error);

    const errorResponse: ApiErrorDTO = {
      error: 'internal_error',
      message: 'An unexpected error occurred. The system has failed you.',
      details: { timestamp: new Date().toISOString() },
    };

    await logError(supabase, 'unexpected_error', sessionId, error);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### Step 6: Update Type Imports
**File:** `src/types.ts`

**Tasks:**
- Ensure all required types are properly exported
- Verify MessageWithSessionDTO is correctly defined
- Verify MessagesListResponseDTO is correctly defined

**Verification:**
- Types are already defined in src/types.ts (confirmed in attached file)
- No changes needed

### Step 7: Test the Endpoint

**Manual Testing:**

1. **Test basic retrieval (all messages):**
```bash
curl http://localhost:4321/api/sessions/{valid-session-id}/messages
```

2. **Test with chat_type filter:**
```bash
curl "http://localhost:4321/api/sessions/{valid-session-id}/messages?chat_type=main"
```

3. **Test pagination:**
```bash
curl "http://localhost:4321/api/sessions/{valid-session-id}/messages?limit=10&offset=0"
curl "http://localhost:4321/api/sessions/{valid-session-id}/messages?limit=10&offset=10"
```

4. **Test sorting:**
```bash
curl "http://localhost:4321/api/sessions/{valid-session-id}/messages?order=desc"
```

5. **Test error cases:**
```bash
# Invalid session ID
curl http://localhost:4321/api/sessions/invalid-uuid/messages

# Non-existent session
curl http://localhost:4321/api/sessions/00000000-0000-0000-0000-000000000000/messages

# Invalid query parameters
curl "http://localhost:4321/api/sessions/{valid-session-id}/messages?limit=1000"
curl "http://localhost:4321/api/sessions/{valid-session-id}/messages?chat_type=invalid"
```

**Automated Testing (Future):**
- Create integration tests with test database
- Test all query parameter combinations
- Test error scenarios
- Verify pagination accuracy
- Verify response schema compliance

### Step 8: Update Documentation

**Tasks:**
- Document the endpoint in API documentation
- Add example requests and responses
- Document query parameters and validation rules
- Add troubleshooting guide for common errors

**Files to Update:**
- README.md (API endpoints section)
- API documentation (if separate file exists)
- Postman/Insomnia collection

### Step 9: Monitor and Optimize

**Initial Monitoring:**
- Check database query performance using Supabase dashboard
- Monitor response times for different query patterns
- Review error logs for unexpected issues

**Performance Baseline:**
- Measure average response time for typical queries
- Identify slow queries (>1s response time)
- Document baseline metrics for future comparison

**Optimization Opportunities:**
- If count queries are slow, consider caching for completed sessions
- If large offsets are common, consider cursor-based pagination
- If response size is large, consider compression

---

## 10. Testing Checklist

### Functional Testing

- [ ] GET request returns messages for valid session
- [ ] Messages are ordered by sent_at (ascending by default)
- [ ] Pagination works correctly (limit, offset)
- [ ] Descending order works correctly
- [ ] chat_type='main' filters correctly
- [ ] chat_type='helper' filters correctly
- [ ] chat_type='all' returns all messages
- [ ] Pagination metadata is accurate (total, has_more)
- [ ] Empty result set handled correctly (no messages)
- [ ] Large offset values work correctly

### Validation Testing

- [ ] Invalid session ID format returns 400
- [ ] Invalid chat_type returns 400
- [ ] limit > 500 returns 400
- [ ] limit < 1 returns 400
- [ ] negative offset returns 400
- [ ] Invalid order value returns 400
- [ ] Non-numeric limit/offset returns 400

### Error Handling Testing

- [ ] Non-existent session returns 404
- [ ] Database connection error returns 500
- [ ] Unexpected errors return 500
- [ ] Error responses follow ApiErrorDTO format
- [ ] Error messages use helper's voice

### Security Testing

- [ ] SQL injection attempts are prevented
- [ ] Large limit values are capped at 500
- [ ] Parameter tampering doesn't cause errors
- [ ] Message content is not logged

### Performance Testing

- [ ] Response time < 1s for 100 messages
- [ ] Response time < 2s for 500 messages
- [ ] Large offset (>100) still performs adequately
- [ ] Database indexes are being used (check query plan)

### Logging Testing

- [ ] Successful requests are logged (info level)
- [ ] Validation errors are logged (warn level)
- [ ] Database errors are logged (error level)
- [ ] Message content is never logged
- [ ] Log entries include necessary metadata

---

## 11. Future Enhancements

### Post-MVP Improvements

**1. Authentication and Authorization**
- Implement user authentication
- Verify user owns the session before returning messages
- Add RLS policies to database

**2. Cursor-Based Pagination**
- Replace offset-based pagination with cursor-based
- Use `sent_at` + `id` as cursor for stable pagination
- Eliminates performance issues with large offsets

**3. Response Caching**
- Cache messages for completed sessions
- Use Redis or CDN for caching
- Significantly reduce database load

**4. Streaming Response**
- Implement Server-Sent Events (SSE) for real-time updates
- Allow clients to subscribe to new messages
- Enable live updates during active sessions

**5. Content Compression**
- Enable gzip/brotli compression at HTTP level
- Reduce response size for large message lists
- Improve performance for slow connections

**6. Advanced Filtering**
- Filter by date range (sent_at)
- Filter by role (user, main_assistant, helper_assistant)
- Full-text search in message content

**7. Rate Limiting**
- Implement per-user rate limiting
- Prevent abuse of pagination endpoints
- Use Redis for distributed rate limiting

**8. Analytics**
- Track most requested sessions
- Monitor query pattern usage
- Identify performance bottlenecks

---

## 12. Appendix

### Related Database Schema

**messages table:**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role message_role NOT NULL,
  chat_type chat_type_enum NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 8000),
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  client_message_id UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Key Indexes:**
```sql
CREATE INDEX idx_messages_session_time_id 
  ON messages(session_id, sent_at, id);

CREATE INDEX idx_messages_chat_type 
  ON messages(session_id, chat_type, sent_at);
```

### API Response Examples

**Example 1: Basic Request (All Messages)**

Request:
```http
GET /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages
```

Response (200 OK):
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Du stehst auf einem belebten Wochenmarkt...",
      "sent_at": "2024-11-10T14:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "user",
      "chat_type": "main",
      "content": "Guten Tag!",
      "sent_at": "2024-11-10T14:00:15.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 2,
    "has_more": false
  }
}
```

**Example 2: Filtered Request (Main Chat Only, Descending)**

Request:
```http
GET /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages?chat_type=main&order=desc&limit=50
```

Response (200 OK):
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440050",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "main_assistant",
      "chat_type": "main",
      "content": "Bis bald!",
      "sent_at": "2024-11-10T14:30:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440049",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "user",
      "chat_type": "main",
      "content": "Vielen Dank!",
      "sent_at": "2024-11-10T14:29:45.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 75,
    "has_more": true
  }
}
```

**Example 3: Paginated Request (Second Page)**

Request:
```http
GET /api/sessions/550e8400-e29b-41d4-a716-446655440000/messages?limit=50&offset=50
```

Response (200 OK):
```json
{
  "messages": [
    // Messages 51-100
  ],
  "pagination": {
    "limit": 50,
    "offset": 50,
    "total": 120,
    "has_more": true
  }
}
```

### Related Files

- `src/types.ts` - DTO type definitions
- `src/db/database.types.ts` - Database type definitions
- `src/db/supabase.client.ts` - Supabase client configuration
- `src/middleware/index.ts` - Request middleware (Supabase client injection)
- `.ai/api-plan.md` - Full API specification
- `.ai/db-plan.md` - Database schema documentation

---

**End of Implementation Plan**

